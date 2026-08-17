import {Eye, ExternalLink, Send, XCircle} from 'lucide-react';
import type {JobAgentJob} from '../../types/jobAgent';

interface PendingJobsPanelProps {
  title: string;
  description: string;
  jobs: JobAgentJob[];
  selected: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onDeliver: (ids: string[]) => void;
  onReject: (ids: string[]) => void;
  onOpenJob: (job: JobAgentJob) => void;
  emptyText: string;
}

function jobSubtitle(job: JobAgentJob) {
  return [job.score ? `匹配 ${job.score}` : '', job.salary, job.city].filter(Boolean).join(' · ');
}

export default function PendingJobsPanel({
  title,
  description,
  jobs,
  selected,
  onToggle,
  onSelectAll,
  onClear,
  onDeliver,
  onReject,
  onOpenJob,
  emptyText,
}: PendingJobsPanelProps) {
  const selectedIds = jobs.filter(job => selected.includes(job.id)).map(job => job.id);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">{title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            全选
          </button>
          <button
            type="button"
            onClick={onClear}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            清空
          </button>
          <button
            type="button"
            onClick={() => onReject(selectedIds)}
            disabled={selectedIds.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            放弃已选 {selectedIds.length}
          </button>
          <button
            type="button"
            onClick={() => onDeliver(selectedIds)}
            disabled={selectedIds.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            投递已选 {selectedIds.length}
          </button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-600 p-6 text-center text-sm text-slate-400 dark:text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {jobs.map((job) => {
            const isSelected = selected.includes(job.id);
            return (
              <div
                key={job.id}
                className={`rounded-xl border p-4 transition-colors ${
                  isSelected
                    ? 'border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/20'
                    : 'border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 dark:text-white truncate">{job.company}｜{job.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{jobSubtitle(job)}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(job.id)}
                    className="mt-1 h-4 w-4 accent-primary-500"
                  />
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {job.score_reason || job.greeting || '等待继续推进。'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenJob(job)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    查看详情
                  </button>
                  {job.url && (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      岗位链接
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
