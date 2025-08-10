import { Sparkles, ShieldAlert, RefreshCw, AtSign } from 'lucide-react';
import { TEST_EMAILS } from '@/lib/constants.js';

export default function Toolbar({
  tone, setTone, onRefresh, loading,
  modeReady, localMode, manualEmail, setManualEmail, onApplyEmail, emailError
}) {
  const showEmailControls = modeReady && localMode;

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onApplyEmail(); // uses current manualEmail from parent
    }
  };

  return (
    <div className="toolbar" role="group" aria-label="App toolbar">
      <div className="seg" role="group" aria-label="Tone selector">
        <button
          className={`seg-item ${tone === 'friendly' ? 'active' : ''}`}
          onClick={() => setTone('friendly')}
          aria-pressed={tone === 'friendly'}
          title="Friendly tone"
        >
          <Sparkles size={14} /> Friendly
        </button>
        <button
          className={`seg-item ${tone === 'concise' ? 'active' : ''}`}
          onClick={() => setTone('concise')}
          aria-pressed={tone === 'concise'}
          title="Concise tone"
        >
          <ShieldAlert size={14} /> Concise
        </button>
      </div>

      {showEmailControls && (
        <div className="field" style={{ minWidth: 0 }}>
          <label htmlFor="testEmail" className="field-label">Test email</label>
          <div className="input-wrap">
            <AtSign size={14} aria-hidden="true" className="input-icon" />
            <input
              id="testEmail"
              className={`input ${emailError ? 'input-error' : ''}`}
              type="email"
              list="testEmails"
              placeholder="e.g. Sincere@april.biz"
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
              onKeyDown={onKeyDown}
              autoCapitalize="none"
              autoCorrect="off"
              disabled={loading}
            />
            <datalist id="testEmails">
              {TEST_EMAILS.map((em) => <option key={em} value={em} />)}
            </datalist>
            <button className="btn" type="button" onClick={() => onApplyEmail()} title="Fetch user for this email" disabled={loading}>
              Fetch
            </button>
          </div>
          {emailError ? <div className="field-help error">{emailError}</div> : (
            <div className="field-help">Pick a preset or type any email, then press Fetch.</div>
          )}
        </div>
      )}

      <div className="grow" />

      <button
        className="btn"
        onClick={onRefresh}
        disabled={loading}
        data-busy={loading ? 'true' : 'false'}
        aria-label="Refresh data"
        title="Refresh data"
      >
        <RefreshCw className="rotate-if-busy" size={16} /> {loading ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  );
}