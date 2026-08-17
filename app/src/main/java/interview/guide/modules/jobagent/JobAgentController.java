package interview.guide.modules.jobagent;

import interview.guide.common.exception.BusinessException;
import interview.guide.common.exception.ErrorCode;
import interview.guide.common.result.Result;
import interview.guide.modules.jobagent.model.JobAgentStatusDTO;
import interview.guide.modules.jobagent.model.ResumeSyncRequest;
import interview.guide.modules.jobagent.model.ResumeSyncResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;

/**
 * 求职投递 Agent 桥接控制器。
 */
@RestController
@RequiredArgsConstructor
public class JobAgentController {

    private static final String PREFIX = "/api/job-agent";

    private final JobAgentProperties properties;
    private final JobAgentProcessManager processManager;
    private final JobAgentClient client;
    private final ResumeSyncService resumeSyncService;

    @GetMapping(PREFIX + "/status")
    public Result<JobAgentStatusDTO> status() {
        if (properties.isEnabled()) {
            processManager.ensureStarted();
        }
        return Result.success(processManager.status());
    }

    @PostMapping(PREFIX + "/start")
    public Result<JobAgentStatusDTO> start() {
        return Result.success(processManager.start());
    }

    @PostMapping(PREFIX + "/stop")
    public Result<JobAgentStatusDTO> stop() {
        return Result.success(processManager.stop());
    }

    @PostMapping(PREFIX + "/resume/sync")
    public Result<ResumeSyncResponse> syncResume(@Valid @RequestBody ResumeSyncRequest request) {
        processManager.ensureStarted();
        return Result.success(resumeSyncService.sync(request.resumeId()));
    }

    @GetMapping(PREFIX + "/jobs/{jobId}/resume/download")
    public ResponseEntity<byte[]> downloadResume(@PathVariable String jobId) {
        processManager.ensureStarted();
        byte[] content = client.download("/api/jobs/" + jobId + "/resume/download");
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .body(content);
    }

    @RequestMapping(
        value = PREFIX + "/**",
        method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE}
    )
    public Result<JsonNode> proxy(HttpServletRequest request, @RequestBody(required = false) String body) {
        if (!properties.isEnabled()) {
            throw new BusinessException(ErrorCode.JOB_AGENT_UNAVAILABLE, "求职投递 Agent 已在配置中禁用");
        }
        processManager.ensureStarted();
        String target = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isBlank() && target.startsWith(contextPath)) {
            target = target.substring(contextPath.length());
        }
        if (target.startsWith(PREFIX)) {
            target = target.substring(PREFIX.length());
        }
        if (!target.startsWith("/")) {
            target = "/" + target;
        }
        target = "/api" + target;
        if (request.getQueryString() != null) {
            target += "?" + request.getQueryString();
        }
        return Result.success(client.request(request.getMethod(), target, body));
    }
}
