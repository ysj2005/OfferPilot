package interview.guide.modules.jobagent;

import interview.guide.common.exception.BusinessException;
import interview.guide.common.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;

/**
 * BossHunter HTTP API 客户端。
 */
@Slf4j
@Component
public class JobAgentClient {

    private static final int MAX_RESPONSE_BYTES = 64 * 1024 * 1024;

    private final JobAgentProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public JobAgentClient(JobAgentProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    }

    public boolean isHealthy() {
        try {
            JsonNode response = request("GET", "/api/health", null, properties.getHealthCheckTimeout());
            return "ok".equals(response.path("status").asText());
        } catch (Exception e) {
            return false;
        }
    }

    public JsonNode request(String method, String path, String body) {
        return request(method, path, body, Duration.ofSeconds(60));
    }

    public byte[] download(String path) {
        URI uri = URI.create(baseUrl() + path);
        HttpRequest request = HttpRequest.newBuilder(uri)
            .timeout(Duration.ofSeconds(60))
            .header("Accept", "application/octet-stream")
            .GET()
            .build();
        try {
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return response.body();
            }
            throw toAgentError(response.body());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessException(ErrorCode.JOB_AGENT_UNAVAILABLE, "求职投递 Agent 请求被中断");
        } catch (IOException e) {
            String detail = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            throw new BusinessException(ErrorCode.JOB_AGENT_UNAVAILABLE, "无法连接求职投递 Agent：" + detail);
        }
    }

    public JsonNode uploadResume(String filename, byte[] content) {
        String boundary = "----interview-guide-" + UUID.randomUUID();
        String prefix = "--" + boundary + "\r\n"
            + "Content-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"\r\n"
            + "Content-Type: text/markdown\r\n\r\n";
        String suffix = "\r\n--" + boundary + "--\r\n";
        byte[] body = new byte[prefix.getBytes(StandardCharsets.UTF_8).length + content.length + suffix.getBytes(StandardCharsets.UTF_8).length];
        byte[] prefixBytes = prefix.getBytes(StandardCharsets.UTF_8);
        byte[] suffixBytes = suffix.getBytes(StandardCharsets.UTF_8);
        System.arraycopy(prefixBytes, 0, body, 0, prefixBytes.length);
        System.arraycopy(content, 0, body, prefixBytes.length, content.length);
        System.arraycopy(suffixBytes, 0, body, prefixBytes.length + content.length, suffixBytes.length);

        HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl() + "/api/resume/upload"))
            .timeout(Duration.ofSeconds(60))
            .header("Content-Type", "multipart/form-data; boundary=" + boundary)
            .header("Accept", "application/json")
            .POST(HttpRequest.BodyPublishers.ofByteArray(body))
            .build();
        try {
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            JsonNode result = parseJson(response.body());
            if (!result.path("success").asBoolean(false)) {
                throw new BusinessException(
                    ErrorCode.RESUME_SYNC_FAILED,
                    result.path("error").asText("简历上传到投递 Agent 失败")
                );
            }
            return result;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessException(ErrorCode.RESUME_SYNC_FAILED, "简历同步请求被中断");
        } catch (IOException e) {
            String detail = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            throw new BusinessException(ErrorCode.RESUME_SYNC_FAILED, "无法连接求职投递 Agent：" + detail);
        }
    }

    private JsonNode request(String method, String path, String body, Duration timeout) {
        URI uri = URI.create(baseUrl() + path);
        HttpRequest.Builder builder = HttpRequest.newBuilder(uri)
            .timeout(timeout)
            .header("Accept", "application/json");
        if (body != null) {
            builder.header("Content-Type", "application/json")
                .method(method, HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
        } else if ("POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method)) {
            builder.method(method, HttpRequest.BodyPublishers.noBody());
        } else {
            builder.method(method, HttpRequest.BodyPublishers.noBody());
        }

        try {
            HttpResponse<byte[]> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return parseJson(response.body());
            }
            throw toAgentError(response.body());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessException(ErrorCode.JOB_AGENT_UNAVAILABLE, "求职投递 Agent 请求被中断");
        } catch (IOException e) {
            String detail = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            throw new BusinessException(ErrorCode.JOB_AGENT_UNAVAILABLE, "无法连接求职投递 Agent：" + detail);
        }
    }

    private JsonNode parseJson(byte[] body) {
        if (body == null || body.length == 0) {
            return objectMapper.createObjectNode();
        }
        return objectMapper.readTree(new String(body, StandardCharsets.UTF_8));
    }

    private BusinessException toAgentError(byte[] body) {
        String message = "求职投递 Agent 请求失败";
        String bodyText = new String(body, StandardCharsets.UTF_8);
        if (!bodyText.isBlank() && bodyText.startsWith("{")) {
            JsonNode node = objectMapper.readTree(bodyText);
            message = node.path("error").asText(message);
        }
        return new BusinessException(ErrorCode.JOB_AGENT_UNAVAILABLE, message);
    }

    private String baseUrl() {
        return "http://" + properties.getHost() + ":" + properties.getPort();
    }
}
