import {useEffect, useState} from 'react';
import {Activity, ChevronDown, ChevronRight, FileStack, RotateCcw, Save, Settings2} from 'lucide-react';
import TagsInput from '../components/jobagent/TagsInput';
import {jobAgentApi} from '../api/jobAgent';
import {getErrorMessage} from '../api/request';
import type {AgentConfigSchema, AgentResumeInfo} from '../types/jobAgent';

type SchemaField = AgentConfigSchema['sections'][number]['fields'][number];

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getIn(obj: Record<string, unknown> | undefined, path: string): unknown {
  if (!obj) return undefined;
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function setIn(config: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split('.');
  const next = deepClone(config);
  let cursor: Record<string, unknown> = next;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value;
      return;
    }
    const current = cursor[key];
    cursor[key] = current !== null && typeof current === 'object' ? current : {};
    cursor = cursor[key] as Record<string, unknown>;
  });
  return next;
}

function defaultValue(field: SchemaField): unknown {
  if (field.default !== undefined) return deepClone(field.default);
  if (field.type === 'number' || field.type === 'slider') return 0;
  if (field.type === 'switch') return false;
  if (field.type === 'tags') return [];
  if (field.type === 'multi-select') return field.options_from === 'cities' ? ['北京'] : [];
  if (field.type === 'select' && field.options && field.options.length > 0) return field.options[0];
  return '';
}

export default function JobAgentConfigPage() {
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [schema, setSchema] = useState<AgentConfigSchema | null>(null);
  const [cities, setCities] = useState<Record<string, string>>({});
  const [currentResume, setCurrentResume] = useState<AgentResumeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [configData, schemaData, citiesData, resumeData] = await Promise.all([
        jobAgentApi.config(),
        jobAgentApi.configSchema(),
        jobAgentApi.cities(),
        jobAgentApi.currentResume(),
      ]);
      setConfig(deepClone(configData));
      setSchema(schemaData);
      setCities(citiesData);
      setCurrentResume(resumeData);
      setExpanded(Object.fromEntries(schemaData.sections.map(section => [section.key, true])));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const result = await jobAgentApi.saveConfig(config);
      setDirty(false);
      setMessage(result.message || '配置已保存');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAiTest = async () => {
    if (dirty) {
      setMessage('请先保存当前配置，再测试 AI 连接。');
      return;
    }
    setTestingAi(true);
    setMessage('');
    try {
      const result = await jobAgentApi.aiDiagnostics();
      setMessage(result.ok ? 'AI 连接检测通过' : (result.messages || ['AI 连接检测未通过']).join('；'));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setTestingAi(false);
    }
  };

  if (loading || !config || !schema) {
    return <div className="py-20 text-center text-sm text-slate-400 dark:text-slate-500">加载中...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Settings2 className="w-7 h-7 text-primary-500" />
            投递配置
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">简历、搜索、AI、反检测与监测设置</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-amber-600 dark:text-amber-400">有未保存的更改</span>}
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-600 dark:text-red-300">{error}</div>}
      {message && <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</div>}

      <div className="space-y-4">
        {schema.sections.map(section => (
          <div key={section.key} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(prev => ({ ...prev, [section.key]: !prev[section.key] }))}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-900/30"
            >
              <span className="text-sm font-semibold text-slate-800 dark:text-white">{section.label}</span>
              {expanded[section.key] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>
            {expanded[section.key] && (
              <div className="px-5 pb-5 space-y-4">
                {section.fields.map(field => {
                  const path = `${section.key}.${field.key}`;
                  if (field.type === 'file') {
                    return (
                      <div key={path} className="rounded-xl border border-slate-200 dark:border-slate-600 p-4">
                        <div className="text-xs text-slate-500 dark:text-slate-400">{field.label}</div>
                        {currentResume ? (
                          <div className="mt-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                            <FileStack className="w-4 h-4 text-primary-500" />
                            {currentResume.filename}
                          </div>
                        ) : (
                          <div className="mt-2 text-sm text-slate-400 dark:text-slate-500">尚未同步简历</div>
                        )}
                        <a href="/job-agent" className="mt-2 inline-block text-xs text-primary-600 dark:text-primary-400 hover:underline">
                          到投递工作台同步简历
                        </a>
                      </div>
                    );
                  }
                  return (
                    <div key={path}>
                      <div className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">{field.label}</div>
                      <SchemaFieldInput
                        field={field}
                        value={getIn(config, path) ?? defaultValue(field)}
                        cities={cities}
                        onChange={value => {
                          setConfig(prev => prev ? setIn(prev, path, value) : prev);
                          setDirty(true);
                        }}
                      />
                      {field.description && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{field.description}</p>}
                    </div>
                  );
                })}

                {section.key === 'ai' && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-600 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">AI 连接检测</div>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">不会消耗对话 Token</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAiTest}
                        disabled={testingAi}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
                      >
                        <Activity className={`w-4 h-4 ${testingAi ? 'animate-pulse' : ''}`} />
                        {testingAi ? '检测中...' : '测试连接'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SchemaFieldInput({
  field,
  value,
  cities,
  onChange,
}: {
  field: SchemaField;
  value: unknown;
  cities: Record<string, string>;
  onChange: (value: unknown) => void;
}) {
  if (field.type === 'switch') {
    return (
      <button
        type="button"
        onClick={() => onChange(!Boolean(value))}
        className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    );
  }

  if (field.type === 'tags') {
    return <TagsInput value={Array.isArray(value) ? value.map(String) : []} onChange={items => onChange(items)} />;
  }

  if (field.type === 'multi-select') {
    const options = field.options_from === 'cities'
      ? Object.keys(cities)
      : (field.options || []);
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div className="flex flex-wrap gap-2">
        {options.map(option => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(active ? selected.filter(item => item !== option) : [...selected, option])}
              className={`px-2.5 py-1 text-xs rounded-full border transition ${
                active
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                  : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <select
        value={String(value ?? '')}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-primary-500"
      >
        {(field.options || []).map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }

  if (field.type === 'slider') {
    const numeric = Number(value || 0);
    return (
      <div>
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={field.step}
          value={numeric}
          onChange={event => onChange(Number(event.target.value))}
          className="w-full accent-primary-500"
        />
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">当前值：{numeric}</div>
      </div>
    );
  }

  if (field.type === 'number') {
    return (
      <input
        type="number"
        min={field.min}
        max={field.max}
        step={field.step}
        value={String(value ?? 0)}
        onChange={event => onChange(Number(event.target.value))}
        className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-primary-500"
      />
    );
  }

  return (
    <input
      type={field.type === 'password' ? 'password' : 'text'}
      value={String(value ?? '')}
      placeholder={field.placeholder}
      onChange={event => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-primary-500"
    />
  );
}
