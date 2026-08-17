package interview.guide.modules.jobagent;

import interview.guide.modules.jobagent.model.JobAgentStatusDTO;
import interview.guide.modules.jobagent.model.ResumeSyncResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("JobAgentController 路由测试")
class JobAgentControllerTest {

    @Mock
    private JobAgentProcessManager processManager;

    @Mock
    private JobAgentClient client;

    @Mock
    private ResumeSyncService resumeSyncService;

    private JobAgentProperties properties;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        properties = new JobAgentProperties();
        JobAgentController controller = new JobAgentController(properties, processManager, client, resumeSyncService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    @DisplayName("status 精确路由优先于 catch-all")
    void statusRouteTakesPrecedence() throws Exception {
        when(processManager.status()).thenReturn(new JobAgentStatusDTO("RUNNING", true, "Agent 运行中", 123L, List.of("ok")));

        mockMvc.perform(get("/api/job-agent/status"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.state").value("RUNNING"))
            .andExpect(jsonPath("$.data.healthy").value(true));
    }

    @Test
    @DisplayName("catch-all 将 workbench 请求代理给 Agent")
    void catchAllProxiesWorkbench() throws Exception {
        JsonNode payload = new ObjectMapper().readTree("{\"采集总数\":10}");
        doNothing().when(processManager).ensureStarted();
        when(client.request(eq("GET"), eq("/api/workbench"), nullable(String.class))).thenReturn(payload);

        mockMvc.perform(get("/api/job-agent/workbench"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.采集总数").value(10));

        verify(processManager).ensureStarted();
    }

    @Test
    @DisplayName("简历同步路由调用 ResumeSyncService")
    void resumeSyncRouteCallsService() throws Exception {
        doNothing().when(processManager).ensureStarted();
        when(resumeSyncService.sync(1L)).thenReturn(new ResumeSyncResponse(1L, "resume-1.md", 22L, "./data/resumes/resume-1.md"));

        mockMvc.perform(post("/api/job-agent/resume/sync")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"resumeId\":1}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.filename").value("resume-1.md"));

        verify(resumeSyncService).sync(1L);
    }
}
