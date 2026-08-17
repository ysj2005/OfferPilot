import {X} from 'lucide-react';
import type {JobAgentJob} from '../../types/jobAgent';

interface JobAgentJobModalProps {
  job: JobAgentJob;
  onClose: () => void;
}

function InfoBlock({label, value}: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3">
      <div className="text-xs text-slate-400 dark:text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">{value}</div>
    </div>
  );
}

export default function JobAgentJobModal({job, onClose}: JobAgentJobModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
      <div className="max-h-[86vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="text-xs font-semibold tracking-wider text-primary-600 dark:text-primary-400">岗位详情</div>
            <h3 className="mt-1 text-xl font-bold text-slate-800 dark:text-white">{job.company}｜{job.title}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {job.salary || '薪资未填'} · {job.city || '城市未填'} · {job.status}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <InfoBlock label="HR" value={[job.hr_name, job.hr_title].filter(Boolean).join(' · ') || '-'} />
          <InfoBlock label="公司" value={[job.company_size, job.company_industry].filter(Boolean).join(' · ') || '-'} />
          <InfoBlock label="匹配分" value={String(job.score ?? '-')} />
          <InfoBlock label="定制简历" value={job.resume_path || '未生成'} />
        </div>

        {job.score_reason && (
          <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-4">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">评分理由</div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-500 dark:text-slate-400">{job.score_reason}</p>
          </div>
        )}

        {job.greeting && (
          <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-4">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">招呼语</div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-500 dark:text-slate-400">{job.greeting}</p>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-4">
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">JD</div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-500 dark:text-slate-400">{job.jd || '-'}</p>
        </div>
      </div>
    </div>
  );
}
