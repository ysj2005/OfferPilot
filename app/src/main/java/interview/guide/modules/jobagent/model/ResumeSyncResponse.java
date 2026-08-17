package interview.guide.modules.jobagent.model;

/**
 * 简历同步结果。
 */
public record ResumeSyncResponse(
    Long resumeId,
    String filename,
    Long size,
    String path
) {
}
