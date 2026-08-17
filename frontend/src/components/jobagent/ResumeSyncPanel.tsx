import {useEffect, useState} from 'react';
import {CheckCircle2, FileStack, Send, Upload} from 'lucide-react';
import {historyApi, ResumeListItem} from '../../api/history';
import {jobAgentApi} from '../../api/jobAgent';
import type {AgentResumeInfo} from '../../types/jobAgent';
import {getErrorMessage} from '../../api/request';

export default function ResumeSyncPanel() {
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [currentResume, setCurrentResume] = useState<AgentResumeInfo | null>(null);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([historyApi.getResumes(), jobAgentApi.currentResume()])
      .then(([list, agentResume]) => {
        if (!active) return;
        setResumes(list);
        setCurrentResume(agentResume);
        if (list.length > 0 && !selectedId) {
          setSelectedId(list[0].id);
        }
      })
      .catch((err: unknown) => {
        if (active) setError(getErrorMessage(err));
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSync = async () => {
    if (!selectedId) return;
    setSyncing(true);
    setNotice('');
    setError('');
    try {
      const result = await jobAgentApi.syncResume(selectedId);
      setCurrentResume({ filename: result.filename, size: result.size, uploaded_at: new Date().toISOString(), path: result.path });
      setNotice(`已同步简历 ${result.filename} 到投递 Agent`);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
          <FileStack className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">简历同步</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">从 InterviewGuide 简历库选择一份同步给投递 Agent</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value ? Number(event.target.value) : '')}
          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-primary-500"
        >
          {resumes.length === 0 && <option value="">暂无简历</option>}
          {resumes.map((resume) => (
            <option key={resume.id} value={resume.id}>
              {resume.filename}（{resume.latestScore ?? '未评分'} 分）
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSync}
          disabled={!selectedId || syncing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {syncing ? '同步中...' : '同步到 Agent'}
        </button>
      </div>

      {resumes.length === 0 && (
        <a
          href="/upload"
          className="mt-3 inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          <Upload className="w-4 h-4" />
          先去上传一份简历
        </a>
      )}

      {currentResume && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <div className="text-sm text-emerald-700 dark:text-emerald-300">
            当前投递简历：<span className="font-medium">{currentResume.filename}</span>
          </div>
        </div>
      )}

      {notice && <div className="mt-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</div>}
      {error && <div className="mt-3 rounded-xl bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-600 dark:text-red-300">{error}</div>}
    </div>
  );
}
