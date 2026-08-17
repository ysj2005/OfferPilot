import {AlertTriangle, CheckCircle2, Circle, Play, RefreshCw, Square} from 'lucide-react';
import type {AgentStatus} from '../../types/jobAgent';

interface AgentStatusPanelProps {
  status: AgentStatus | null;
  loading: boolean;
  agentUrl: string;
  onStart: () => void;
  onStop: () => void;
  onRefresh: () => void;
}

const STATE_LABELS: Record<string, string> = {
  RUNNING: '运行中',
  STARTING: '启动中',
  STOPPED: '已停止',
  ERROR: '异常',
  DISABLED: '已禁用',
};

export default function AgentStatusPanel({
  status,
  loading,
  agentUrl,
  onStart,
  onStop,
  onRefresh,
}: AgentStatusPanelProps) {
  const state = status?.state || 'STOPPED';
  const isRunning = state === 'RUNNING' && status?.healthy;
  const isStarting = state === 'STARTING';
  const isError = state === 'ERROR';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isRunning
              ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
              : isError
                ? 'bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
          }`}>
            {isRunning
              ? <CheckCircle2 className="w-5 h-5" />
              : isError
                ? <AlertTriangle className="w-5 h-5" />
                : <Circle className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-800 dark:text-white">投递 Agent</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                isRunning
                  ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                  : isError
                    ? 'bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
              }`}>
                {STATE_LABELS[state] || state}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{status?.message || '正在检查 Agent 状态'}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {agentUrl}
              {status?.pid ? ` · PID ${status.pid}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          {isRunning ? (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              <Square className="w-4 h-4" />
              停止
            </button>
          ) : (
            <button
              type="button"
              onClick={onStart}
              disabled={isStarting}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              {isStarting ? '启动中' : '启动'}
            </button>
          )}
        </div>
      </div>

      {status && status.logs.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-2">最近日志</div>
          <pre className="max-h-44 overflow-y-auto rounded-xl bg-slate-50 dark:bg-slate-900 p-3 text-xs leading-5 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
            {status.logs.slice(-20).join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
}
