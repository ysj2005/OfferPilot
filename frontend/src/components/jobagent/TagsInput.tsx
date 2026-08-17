import {useState} from 'react';
import {X} from 'lucide-react';

interface TagsInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export default function TagsInput({value, onChange, placeholder}: TagsInputProps) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft('');
  };

  const remove = (item: string) => {
    onChange(value.filter(candidate => candidate !== item));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 focus-within:border-primary-500">
        {value.map(item => (
          <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 dark:bg-primary-900/40 px-2.5 py-1 text-xs text-primary-700 dark:text-primary-300">
            {item}
            <button type="button" onClick={() => remove(item)} className="text-primary-400 hover:text-primary-600">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              commit();
            }
            if (event.key === 'Backspace' && draft === '' && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={commit}
          placeholder={placeholder || '输入后回车添加'}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
        />
      </div>
    </div>
  );
}
