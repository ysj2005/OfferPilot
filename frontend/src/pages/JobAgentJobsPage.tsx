import {useEffect, useState} from 'react';
import {BriefcaseBusiness, Eye, RefreshCw} from 'lucide-react';
import JobAgentJobModal from '../components/jobagent/JobAgentJobModal';
import {jobAgentApi} from '../api/jobAgent';
import {getErrorMessage} from '../api/request';
import type {JobAgentJob} from '../types/jobAgent';

const STATUS_FILTERS = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待处理' },
  { value: 'ready', label: '待确认' },
  { value: 'approved', label: '已确认' },
  { value: 'sent', label: '已发送' },
  { value: 'replied', label: '已回复' },
  { value: 'rejected', label: '已放弃' },
];

export default function JobAgentJobsPage() {
  const [jobs, setJobs] = useState<JobAgentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedJob, setSelectedJob] = useState<JobAgentJob | null>(null);
  const [error, setError] = useState('');

  const load = async (status = statusFilter) => {
    setLoading(true);
    setError('');
    try {
      const data = await jobAgentApi.jobs({ status: status || undefined, limit: 300 });
      setJobs(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <BriefcaseBusiness className="w-7 h-7 text-primary-500" />
            岗位池
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">集中查看已采集岗位、AI 分数和状态</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={event => {
              setStatusFilter(event.target.value);
              load(event.target.value);
            }}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-primary-500"
          >
            {STATUS_FILTERS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-600 dark:text-red-300">{error}</div>}

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">加载中...</div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">暂无岗位数据</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">岗位</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">城市/薪资</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">AI 分</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">状态</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">操作</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} className="border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/30">
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800 dark:text-white">{job.company}｜{job.title}</div>
                      {job.experience && <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{job.experience}</div>}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {[job.city, job.salary].filter(Boolean).join(' · ') || '-'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        Number(job.score) >= 70
                          ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                          : Number(job.score) >= 50
                            ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}>
                        {job.score ?? '-'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{job.status}</td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedJob(job)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedJob && <JobAgentJobModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </div>
  );
}
