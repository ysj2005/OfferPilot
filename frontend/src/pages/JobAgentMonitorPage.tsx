import {useEffect, useState} from 'react';
import {Download, Eye, MessageCircle, RefreshCw, Send, XCircle} from 'lucide-react';
import {jobAgentApi} from '../api/jobAgent';
import {getErrorMessage} from '../api/request';
import type {HistoryItem} from '../types/jobAgent';

type MonitorFilter = 'pending' | 'resume' | 'follow_up' | 'replied';

const ACTION_LABELS: Record<string, string> = {
  reply_pending: '待回复',
  replied: '已回复',
  auto_replied: '自动回复',
  needs_resume: '简历请求',
  resume_sent: '简历已发',
  resume_failed: '简历生成失败',
  follow_up_sent: '自动跟进',
};

export default function JobAgentMonitorPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MonitorFilter>('pending');
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await jobAgentApi.history({ limit: 100, include_unresolved: true });
      setHistory(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pendingReplies = history.filter(item => item.action === 'reply_pending');
  const resumeItems = history.filter(item => ['needs_resume', 'resume_sent', 'resume_failed'].includes(item.action));
  const followUps = history.filter(item => item.action === 'follow_up_sent');
  const repliedItems = history.filter(item => ['replied', 'auto_replied'].includes(item.action));

  const visibleItems = filter === 'resume'
    ? resumeItems
    : filter === 'follow_up'
      ? followUps
      : filter === 'replied'
        ? repliedItems
        : pendingReplies;

  const handleReply = async (item: HistoryItem) => {
    try {
      await jobAgentApi.reply(item.id, drafts[item.id] ?? item.detail ?? '');
      setNotice('回复已记录，请在招聘平台手动发送。');
      await load();
    } catch (err: unknown) {
      setNotice(getErrorMessage(err));
    }
  };

  const handleDismiss = async (item: HistoryItem) => {
    if (!window.confirm('确定放弃这条待回复建议吗？')) return;
    try {
      await jobAgentApi.dismiss(item.id);
      setNotice('已放弃这条待回复建议。');
      await load();
    } catch (err: unknown) {
      setNotice(getErrorMessage(err));
    }
  };

  const handleMarkSent = async (jobId: string) => {
    try {
      await jobAgentApi.markResumeSent(jobId);
      setNotice('已标记定制简历已发送。');
      await load();
    } catch (err: unknown) {
      setNotice(getErrorMessage(err));
    }
  };

  const filters: Array<{ key: MonitorFilter; label: string; count: number }> = [
    { key: 'pending', label: '待处理', count: pendingReplies.length },
    { key: 'resume', label: '简历请求', count: resumeItems.length },
    { key: 'follow_up', label: '自动跟进', count: followUps.length },
    { key: 'replied', label: '已回复', count: repliedItems.length },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <MessageCircle className="w-7 h-7 text-primary-500" />
            监测执行
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">处理 HR 回复建议、简历请求和跟进记录</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-600 dark:text-red-300">{error}</div>}
      {notice && <div className="rounded-xl bg-primary-50 dark:bg-primary-900/30 px-4 py-3 text-sm text-primary-700 dark:text-primary-300">{notice}</div>}

      <div className="flex flex-wrap gap-2">
        {filters.map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === item.key
                ? 'bg-primary-500 text-white'
                : 'border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-primary-300 dark:hover:border-primary-700'
            }`}
          >
            {item.label} {item.count}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">加载中...</div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 p-10 text-center text-sm text-slate-400 dark:text-slate-500">暂无记录</div>
        ) : (
          visibleItems.map(item => (
            <div key={item.id} className="grid gap-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 lg:grid-cols-[130px_1fr_160px]">
              <div className="text-xs text-slate-400 dark:text-slate-500">
                <div>{item.created_at}</div>
                <div className="mt-2 inline-flex px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs">
                  {ACTION_LABELS[item.action] || item.action}
                </div>
              </div>

              <div>
                <div className="font-medium text-slate-800 dark:text-white">{item.company || '岗位'}｜{item.title || '监测记录'}</div>
                {item.action === 'reply_pending' ? (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">AI 建议回复</div>
                    <textarea
                      value={drafts[item.id] ?? item.detail ?? ''}
                      onChange={event => setDrafts(prev => ({ ...prev, [item.id]: event.target.value }))}
                      className="min-h-[92px] w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3 text-sm leading-6 text-slate-700 dark:text-slate-200 outline-none focus:border-primary-500"
                    />
                  </div>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400 whitespace-pre-wrap">
                    {item.detail || ACTION_LABELS[item.action] || '无详情'}
                  </p>
                )}
              </div>

              <div className="grid content-start gap-2">
                {item.action === 'reply_pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleReply(item)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-primary-500 text-white hover:bg-primary-600"
                    >
                      <Send className="w-4 h-4" />
                      确认回复
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismiss(item)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <XCircle className="w-4 h-4" />
                      放弃
                    </button>
                  </>
                )}
                {item.action === 'needs_resume' && (
                  <>
                    <a
                      href={jobAgentApi.resumeDownloadUrl(item.job_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-primary-500 text-white hover:bg-primary-600"
                    >
                      <Download className="w-4 h-4" />
                      下载定制简历
                    </a>
                    <button
                      type="button"
                      onClick={() => handleMarkSent(item.job_id)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <Eye className="w-4 h-4" />
                      标记已发送
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
