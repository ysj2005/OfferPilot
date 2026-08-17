package interview.guide.modules.jobagent;

import interview.guide.common.model.AsyncTaskStatus;
import interview.guide.modules.jobagent.model.ResumeSyncResponse;
import interview.guide.modules.resume.model.ResumeDetailDTO;
import interview.guide.modules.resume.service.ResumeHistoryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ResumeSyncService 测试")
class ResumeSyncServiceTest {

    @Mock
    private ResumeHistoryService resumeHistoryService;

    @Mock
    private JobAgentClient jobAgentClient;

    @Test
    @DisplayName("同步成功时返回 Agent 文件信息")
    void syncReturnsAgentFileInfo() throws Exception {
        ResumeDetailDTO detail = new ResumeDetailDTO(
            1L,
            "resume.md",
            1024L,
            "text/markdown",
            "http://localhost/resume.md",
            LocalDateTime.now(),
            1,
            "姓名：张三\n技能：Java",
            AsyncTaskStatus.COMPLETED,
            null,
            List.of(),
            List.of()
        );
        JsonNode uploadResult = new ObjectMapper().readTree(
            "{\"success\":true,\"filename\":\"resume-1.md\",\"size\":22,\"path\":\"./data/resumes/resume-1.md\"}"
        );
        when(resumeHistoryService.getResumeDetail(1L)).thenReturn(detail);
        when(jobAgentClient.uploadResume(eq("resume-1.md"), any(byte[].class))).thenReturn(uploadResult);

        ResumeSyncService service = new ResumeSyncService(resumeHistoryService, jobAgentClient);
        ResumeSyncResponse response = service.sync(1L);

        assertThat(response.filename()).isEqualTo("resume-1.md");
        assertThat(response.size()).isEqualTo(22);
        verify(jobAgentClient).uploadResume(eq("resume-1.md"), any(byte[].class));
    }
}
