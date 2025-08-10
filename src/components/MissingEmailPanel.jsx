import { AtSign, Play } from 'lucide-react';
import { TEST_EMAILS } from '@/lib/constants.js';

export default function MissingEmailPanel({ value, setValue, onApply, error, disabled }) {
  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onApply(value);
    }
  };

  return (
    <div className="email-panel">
      <div className="field" style={{ minWidth: 0 }}>
        <label htmlFor="missingEmail" className="field-label">Enter requester email</label>
        <div className="input-wrap">
          <AtSign size={14} aria-hidden="true" className="input-icon" />
          <input
            id="missingEmail"
            className={`input ${error ? 'input-error' : ''}`}
            type="email"
            list="missingEmailPresets"
            placeholder="e.g. Sincere@april.biz"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            autoCapitalize="none"
            autoCorrect="off"
            disabled={disabled}
          />
          <datalist id="missingEmailPresets">
            {TEST_EMAILS.map((em) => <option key={em} value={em} />)}
          </datalist>
          <button className="btn" type="button" onClick={() => onApply(value)} disabled={disabled} title="Fetch user for this email">
            <Play size={16} /> Fetch
          </button>
        </div>
        {error ? (
          <div className="field-help error">{error}</div>
        ) : (
          <div className="field-help">Use one of the presets or type any valid email, then press Fetch.</div>
        )}
      </div>
    </div>
  );
}