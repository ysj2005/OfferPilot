package interview.guide.modules.jobagent;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("JobAgentClient 测试")
class JobAgentClientTest {

    private HttpServer server;
    private JobAgentClient client;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    @DisplayName("health 接口返回 ok")
    void isHealthyReturnsTrue() throws IOException {
        startServer("/api/health", "{\"status\":\"ok\"}");

        assertThat(client.isHealthy()).isTrue();
    }

    @Test
    @DisplayName("GET 代理返回 JSON")
    void getProxiesJson() throws IOException {
        startServer("/api/funnel", "{\"采集总数\":10}");

        JsonNode result = client.request("GET", "/api/funnel", null);

        assertThat(result.path("采集总数").asInt()).isEqualTo(10);
    }

    @Test
    @DisplayName("简历上传构造 multipart 请求")
    void uploadResumeBuildsMultipart() throws IOException {
        startServer("/api/resume/upload", "{\"success\":true,\"filename\":\"resume-1.md\",\"size\":4}");

        JsonNode result = client.uploadResume("resume-1.md", "abcd".getBytes(StandardCharsets.UTF_8));

        assertThat(result.path("success").asBoolean()).isTrue();
        assertThat(result.path("filename").asText()).isEqualTo("resume-1.md");
        assertThat(result.path("size").asLong()).isEqualTo(4);
    }

    private void startServer(String contextPath, String responseBody) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext(contextPath, exchange -> writeResponse(exchange, responseBody));
        server.start();

        JobAgentProperties properties = new JobAgentProperties();
        properties.setHost("127.0.0.1");
        properties.setPort(server.getAddress().getPort());
        client = new JobAgentClient(properties, new ObjectMapper());
    }

    private void writeResponse(HttpExchange exchange, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(200, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
