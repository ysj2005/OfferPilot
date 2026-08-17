import {useCallback, useEffect, useState} from 'react';
import {AlertTriangle, BriefcaseBusiness, Play, RefreshCw, Square} from 'lucide-react';
import AgentStatusPanel from '../components/jobagent/AgentStatusPanel';
import JobAgentJobModal from '../components/jobagent/JobAgentJobModal';
import PendingJobsPanel from '../components/jobagent/PendingJobsPanel';
import ResumeSyncPanel from '../components/jobagent/ResumeSyncPanel';
import {jobAgentApi} from '../api/jobAgent';
import {getErrorMessage} from '../api/request';
import type {AgentStatus, JobAgentJob, PreflightCheck, PreflightResponse, WorkbenchData} from '../types/jobAgent';

type TaskMode = 'full' | 'collect' | 'monitor' | 'rescore';

const MODES: Array<{ mode: TaskMode; title: string; description: string }> = [
  { mode: 'full', title: '运行全流程', description: '采集 → AI评分 → 确认投递 → 打招呼 → 持续监测' },
  { mode: 'collect', title: '单独采集', description: '采集岗位、AI评分，完成后等待确认' },
  { mode: 'monitor', title: '单独监测', description: '监测 HR 回复、简历请求和跟进建议' },
  { mode: 'rescore', title: '重新评分', description: '对之前被过滤的岗位重新进行 AI 评分' },
];

function taskStatusText(status: string) {
  if (status === 'failed') return '运行失败';
  if (status === 'completed') return '已结束';
  if (status === 'stopped') return '已停止';
  if (status === 'stopping') return '停止中';
  return '运行中';
}

function parsePreflight(data: PreflightResponse): PreflightCheck[] {
  if (!data) return [];
  const checks = Array.isArray(data.checks) ? data.checks : [];
  const messages = Array.isArray(data.messages) ? data.messages : [];
  if (!data.ok && checks.length === 0 && messages.length > 0) {
    return messages.map((message, index) => ({
      id: `legacy-${index}`,
      title: '启动检查',
      status: 'error' as const,
      message,
      detail: '请按提示修复后重新检测',
      action: '' as const,
    }));
  }
  return checks;
}

export default function JobAgentPage() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [workbench, setWorkbench] = useState<WorkbenchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [preflightChecks, setPreflightChecks] = useState<PreflightCheck[]>([]);
  const [preflightMode, setPreflightMode] = useState<TaskMode>('full');
  const [modePending, setModePending] = useState<TaskMode | null>(null);
  const [selectedConfirmation, setSelectedConfirmation] = useState<string[]>([]);
  const [selectedGreetings, setSelectedGreetings] = useState<string[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobAgentJob | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [nextStatus, nextWorkbench] = await Promise.all([
        jobAgentApi.status(),
        jobAgentApi.workbench(),
      ]);
      setStatus(nextStatus);
      setWorkbench(nextWorkbench);
      setError('');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(() => refresh(true), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const handleStartStop = async (mode: TaskMode) => {
    const active = workbench?.task;
    if (active?.mode === mode && (active.status === 'running' || active.status === 'stopping')) {
      if (!window.confirm(`是否停止当前${active.label}任务？已完成结果会保留。`)) return;
      setNotice('正在请求停止任务...');
      try {
        await jobAgentApi.stopTask(active.id);
        setNotice('已请求停止任务。');
        await refresh();
      } catch (err: unknown) {
        setNotice(getErrorMessage(err));
      }
      return;
    }
    if (active) {
      setNotice(`当前正在运行${active.label}，请先停止后再启动其他模式。`);
      return;
    }

    setModePending(mode);
    setNotice('正在执行启动前检查...');
    try {
      const target = MODES.find(item => item.mode === mode);
      const preflight = await jobAgentApi.preflight(mode);
      setPreflightMode(mode);
      setPreflightChecks(parsePreflight(preflight));
      if (!preflight.ok) {
        setNotice('请先处理启动检查中的问题。');
        return;
      }
      await jobAgentApi.startTask(mode);
      setNotice(`${target?.title || '任务'}已启动，日志会在下方更新。`);
      await refresh();
    } catch (err: unknown) {
      setNotice(getErrorMessage(err));
    } finally {
      setModePending(null);
    }
  };

  const handleDeliver = async (ids: string[], directSend = false) => {
    if (ids.length === 0) return;
    const label = directSend ? '发送招呼语' : '投递';
    if (!window.confirm(`确认对 ${ids.length} 个岗位执行${label}吗？`)) return;
    try {
      await jobAgentApi.deliver(ids, directSend);
      setNotice(`已确认${label} ${ids.length} 个岗位。`);
      setSelectedConfirmation(prev => prev.filter(id => !ids.includes(id)));
      setSelectedGreetings(prev => prev.filter(id => !ids.includes(id)));
      await refresh();
    } catch (err: unknown) {
      setNotice(getErrorMessage(err));
    }
  };

  const handleReject = async (ids: string[]) => {
    if (ids.length === 0) return;
    if (!window.confirm(`确定放弃这 ${ids.length} 个岗位吗？`)) return;
    try {
      await jobAgentApi.reject(ids);
      setNotice(`已放弃 ${ids.length} 个岗位。`);
      setSelectedConfirmation(prev => prev.filter(id => !ids.includes(id)));
      setSelectedGreetings(prev => prev.filter(id => !ids.includes(id)));
      await refresh();
    } catch (err: unknown) {
      setNotice(getErrorMessage(err));
    }
  };

  const activeTask = workbench?.task ?? null;
  const visibleTask = activeTask || workbench?.last_task || null;
  const actionableChecks = preflightChecks.filter(check => check.status !== 'pass');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <BriefcaseBusiness className="w-7 h-7 text-primary-500" />
            投递工作台
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">采集、评分、人工确认、投递与 HR 回复监测</p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      <AgentStatusPanel
        status={status}
        loading={loading || refreshing}
        agentUrl="http://127.0.0.1:8686"
        onStart={async () => {
          try {
            await jobAgentApi.start();
            await refresh();
          } catch (err: unknown) {
            setError(getErrorMessage(err));
          }
        }}
        onStop={async () => {
          try {
            await jobAgentApi.stop();
            await refresh();
          } catch (err: unknown) {
            setError(getErrorMessage(err));
          }
        }}
        onRefresh={() => refresh()}
      />

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-600 dark:text-red-300">{error}</div>
      )}
      {notice && (
        <div className="rounded-xl bg-primary-50 dark:bg-primary-900/30 px-4 py-3 text-sm text-primary-700 dark:text-primary-300">{notice}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {MODES.map(item => {
          const isActive = activeTask?.mode === item.mode;
          const disabled = Boolean(activeTask && !isActive);
          return (
            <button
              key={item.mode}
              type="button"
              onClick={() => handleStartStop(item.mode)}
              disabled={disabled || modePending !== null}
              className={`min-h-[112px] rounded-xl border p-4 text-left transition ${
                isActive
                  ? 'border-primary-500 bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                  : disabled
                    ? 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-400 opacity-50'
                    : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-primary-300 dark:hover:border-primary-700'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{isActive ? `${item.title}中` : item.title}</div>
                {isActive ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4" />}
              </div>
              <p className={`mt-2 text-xs leading-5 ${isActive ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                {item.description}
              </p>
            </button>
          );
        })}
      </div>

      {actionableChecks.length > 0 && (
        <div className={`rounded-2xl border p-4 ${actionableChecks.some(check => check.status === 'error') ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${actionableChecks.some(check => check.status === 'error') ? 'text-red-500' : 'text-amber-600'}`} />
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              启动检查（{preflightMode}）发现 {actionableChecks.length} 项需要处理
            </div>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {actionableChecks.map((check, index) => (
              <div key={`${check.id}-${index}`} className="rounded-xl bg-white dark:bg-slate-800 p-3">
                <div className="text-xs text-slate-400 dark:text-slate-500">{check.title}</div>
                <div className="mt-0.5 text-sm font-medium text-slate-700 dark:text-slate-200">{check.message}</div>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{check.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {visibleTask && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-white">{visibleTask.label}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                状态：{taskStatusText(visibleTask.status)}
                {visibleTask.deadline_at ? ` · 截止 ${visibleTask.deadline_at}` : ''}
              </p>
            </div>
            {activeTask && (
              <button
                type="button"
                onClick={() => handleStartStop(activeTask.mode as TaskMode)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                <Square className="w-4 h-4" />
                停止任务
              </button>
            )}
          </div>
          {visibleTask.error && (
            <div className="mt-3 rounded-xl bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-600 dark:text-red-300">
              {visibleTask.error}
            </div>
          )}
          {visibleTask.logs.length > 0 && (
            <pre className="mt-3 max-h-56 overflow-y-auto rounded-xl bg-slate-50 dark:bg-slate-900 p-3 text-xs leading-5 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {visibleTask.logs.slice(-30).join('\n')}
            </pre>
          )}
        </div>
      )}

      <ResumeSyncPanel />

      <PendingJobsPanel
        title="今日待确认"
        description="AI 评分通过、等待人工确认的岗位"
        jobs={workbench?.pending_confirmation || []}
        selected={selectedConfirmation}
        onToggle={id => setSelectedConfirmation(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}
        onSelectAll={() => setSelectedConfirmation((workbench?.pending_confirmation || []).map(job => job.id))}
        onClear={() => setSelectedConfirmation([])}
        onDeliver={ids => handleDeliver(ids)}
        onReject={handleReject}
        onOpenJob={setSelectedJob}
        emptyText="今天暂时没有待确认岗位。"
      />

      <PendingJobsPanel
        title="待发送招呼语"
        description="已生成招呼语，确认后进入发送流程"
        jobs={workbench?.pending_greetings || []}
        selected={selectedGreetings}
        onToggle={id => setSelectedGreetings(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}
        onSelectAll={() => setSelectedGreetings((workbench?.pending_greetings || []).map(job => job.id))}
        onClear={() => setSelectedGreetings([])}
        onDeliver={ids => handleDeliver(ids, true)}
        onReject={handleReject}
        onOpenJob={setSelectedJob}
        emptyText="暂时没有待发送招呼语。"
      />

      {selectedJob && <JobAgentJobModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </div>
  );
}
