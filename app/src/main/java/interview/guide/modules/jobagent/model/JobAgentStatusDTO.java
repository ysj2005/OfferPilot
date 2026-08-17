package interview.guide.modules.jobagent.model;

import java.util.List;

/**
 * Agent 进程状态。
 */
public record JobAgentStatusDTO(
    String state,
    boolean healthy,
    String message,
    Long pid,
    List<String> logs
) {
}
