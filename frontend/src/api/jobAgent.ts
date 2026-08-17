import { request } from './request';
import type {
  AgentConfigSchema,
  AgentResumeInfo,
  AgentStatus,
  AiDiagnostics,
  HistoryItem,
  JobAgentJob,
  PreflightResponse,
  ResumeSyncResponse,
  WorkbenchData,
  WorkbenchTask,
} from '../types/jobAgent';

export const jobAgentApi = {
  status(): Promise<AgentStatus> {
    return request.get<AgentStatus>('/api/job-agent/status');
  },

  start(): Promise<AgentStatus> {
    return request.post<AgentStatus>('/api/job-agent/start');
  },

  stop(): Promise<AgentStatus> {
    return request.post<AgentStatus>('/api/job-agent/stop');
  },

  workbench(): Promise<WorkbenchData> {
    return request.get<WorkbenchData>('/api/job-agent/workbench');
  },

  jobs(params?: { status?: string; limit?: number; offset?: number }): Promise<JobAgentJob[]> {
    return request.get<JobAgentJob[]>('/api/job-agent/jobs', { params });
  },

  history(params?: { limit?: number; include_unresolved?: boolean }): Promise<HistoryItem[]> {
    return request.get<HistoryItem[]>('/api/job-agent/history', { params });
  },

  config(): Promise<Record<string, unknown>> {
    return request.get<Record<string, unknown>>('/api/job-agent/config');
  },

  saveConfig(config: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    return request.post<{ success: boolean; message: string }>('/api/job-agent/config', config);
  },

  configSchema(): Promise<AgentConfigSchema> {
    return request.get<AgentConfigSchema>('/api/job-agent/config/schema');
  },

  cities(): Promise<Record<string, string>> {
    return request.get<Record<string, string>>('/api/job-agent/config/cities');
  },

  preflight(mode: string): Promise<PreflightResponse> {
    return request.get<PreflightResponse>('/api/job-agent/workbench/preflight', { params: { mode } });
  },

  aiDiagnostics(): Promise<AiDiagnostics> {
    return request.get<AiDiagnostics>('/api/job-agent/diagnostics/ai');
  },

  startTask(mode: string): Promise<WorkbenchTask> {
    return request.post<WorkbenchTask>('/api/job-agent/workbench/task', { mode });
  },

  stopTask(taskId: string): Promise<WorkbenchTask> {
    return request.post<WorkbenchTask>(`/api/job-agent/workbench/task/${taskId}/stop`);
  },

  deliver(jobIds: string[], directSend = false): Promise<unknown> {
    return request.post('/api/job-agent/workbench/deliver', { job_ids: jobIds, direct_send: directSend });
  },

  reject(jobIds: string[]): Promise<{ success: boolean; count: number }> {
    return request.post<{ success: boolean; count: number }>('/api/job-agent/workbench/reject', { job_ids: jobIds });
  },

  syncResume(resumeId: number): Promise<ResumeSyncResponse> {
    return request.post<ResumeSyncResponse>('/api/job-agent/resume/sync', { resumeId });
  },

  currentResume(): Promise<AgentResumeInfo | null> {
    return request.get<AgentResumeInfo | null>('/api/job-agent/resume');
  },

  reply(historyId: number, message: string): Promise<{ success: boolean }> {
    return request.post<{ success: boolean }>(`/api/job-agent/history/${historyId}/reply`, { message });
  },

  dismiss(historyId: number): Promise<{ success: boolean }> {
    return request.post<{ success: boolean }>(`/api/job-agent/history/${historyId}/dismiss`);
  },

  markResumeSent(jobId: string): Promise<{ success: boolean }> {
    return request.post<{ success: boolean }>(`/api/job-agent/jobs/${jobId}/mark-resume-sent`);
  },

  resumeDownloadUrl(jobId: string): string {
    return `/api/job-agent/jobs/${jobId}/resume/download`;
  },
};
