package interview.guide.modules.jobagent;

import interview.guide.common.exception.BusinessException;
import interview.guide.common.exception.ErrorCode;
import interview.guide.modules.jobagent.model.ResumeSyncResponse;
import interview.guide.modules.resume.model.ResumeDetailDTO;
import interview.guide.modules.resume.service.ResumeHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;

import java.nio.charset.StandardCharsets;

/**
 * 从 InterviewGuide 简历库同步简历到投递 Agent。
 */
@Service
@RequiredArgsConstructor
public class ResumeSyncService {

    private final ResumeHistoryService resumeHistoryService;
    private final JobAgentClient jobAgentClient;

    public ResumeSyncResponse sync(Long resumeId) {
        ResumeDetailDTO detail = resumeHistoryService.getResumeDetail(resumeId);
        if (detail.resumeText() == null || detail.resumeText().isBlank()) {
            throw new BusinessException(ErrorCode.RESUME_SYNC_FAILED, "该简历没有可同步的文本内容");
        }

        String filename = "resume-" + resumeId + ".md";
        byte[] content = detail.resumeText().getBytes(StandardCharsets.UTF_8);
        JsonNode result = jobAgentClient.uploadResume(filename, content);
        return new ResumeSyncResponse(
            resumeId,
            result.path("filename").asText(filename),
            result.path("size").asLong(content.length),
            result.path("path").asText("")
        );
    }
}
