export type AgentState = 'STOPPED' | 'STARTING' | 'RUNNING' | 'ERROR' | 'DISABLED';

export interface AgentStatus {
  state: AgentState;
  healthy: boolean;
  message: string;
  pid: number | null;
  logs: string[];
}

export interface JobAgentJob {
  id: string;
  title: string;
  company: string;
  salary?: string;
  city?: string;
  experience?: string;
  jd?: string;
  hr_name?: string;
  hr_title?: string;
  hr_active?: string;
  company_size?: string;
  company_industry?: string;
  url?: string;
  score?: number;
  score_reason?: string;
  greeting?: string;
  status: string;
  resume_path?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkbenchTask {
  id: string;
  mode: string;
  label: string;
  status: string;
  logs: string[];
  error: string | null;
  created_at: string;
  updated_at: string;
  deadline_at: string | null;
  stop_reason: string | null;
}

export interface WorkbenchData {
  funnel: Record<string, number>;
  pending_confirmation: JobAgentJob[];
  pending_greetings: JobAgentJob[];
  send_errors: JobAgentJob[];
  needs_resume: JobAgentJob[];
  task: WorkbenchTask | null;
  last_task: WorkbenchTask | null;
}

export interface HistoryItem {
  id: number;
  job_id: string;
  action: string;
  detail?: string;
  detail_payload?: Record<string, unknown>;
  created_at: string;
  company?: string;
  title?: string;
  resume_path?: string;
  resolved?: boolean;
}

export interface PreflightCheck {
  id: string;
  title: string;
  status: 'pass' | 'warning' | 'error';
  message: string;
  detail: string;
  action?: 'config' | 'browser' | '';
}

export interface PreflightResponse {
  ok: boolean;
  messages: string[];
  checks: PreflightCheck[];
}

export interface AiDiagnostics {
  ok: boolean;
  messages: string[];
  checks: PreflightCheck[];
}

export interface AgentResumeInfo {
  filename: string;
  size: number;
  uploaded_at: string;
  path: string;
}

export interface ResumeSyncResponse {
  resumeId: number;
  filename: string;
  size: number;
  path: string;
}

export interface AgentConfigSchema {
  sections: Array<{
    key: string;
    label: string;
    icon: string;
    fields: Array<{
      key: string;
      label: string;
      type: string;
      description?: string;
      options?: string[];
      options_from?: string;
      min?: number;
      max?: number;
      step?: number;
      default?: unknown;
      placeholder?: string;
    }>;
  }>;
}
