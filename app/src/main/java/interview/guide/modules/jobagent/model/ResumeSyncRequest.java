package interview.guide.modules.jobagent.model;

import jakarta.validation.constraints.NotNull;

/**
 * 简历同步请求。
 */
public record ResumeSyncRequest(@NotNull Long resumeId) {
}
