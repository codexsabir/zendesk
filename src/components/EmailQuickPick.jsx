import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { TEST_EMAILS } from '@/lib/constants.js';

export default function EmailQuickPick({
  value,
  setValue,
  onApplyEmail,   // function(email?: string) -> void
  disabled
}) {
  // Find the current index or default to 0
  const idx = Math.max(0, TEST_EMAILS.findIndex(e => e === value));
  const prevIdx = idx <= 0 ? TEST_EMAILS.length - 1 : idx - 1;
  const nextIdx = (idx + 1) % TEST_EMAILS.length;

  const onPrev = () => {
    const em = TEST_EMAILS[prevIdx];
    setValue(em);
    onApplyEmail(em);
  };
  const onNext = () => {
    const em = TEST_EMAILS[nextIdx];
    setValue(em);
    onApplyEmail(em);
  };

  const runAll = async () => {
    // Sequentially apply each email to exercise the flow end-to-end
    for (const em of TEST_EMAILS) {
      setValue(em);
      // Allow UI to update
      await new Promise(r => setTimeout(r, 50));
      onApplyEmail(em);
      // Small delay so you can observe changes; adjust as desired
      await new Promise(r => setTimeout(r, 500));
    }
  };

  return (
    <div className="qp-wrap">
      <div className="qp-controls">
        <button className="btn" type="button" onClick={onPrev} disabled={disabled} title="Previous email">
          <ChevronLeft size={16} /> Prev
        </button>
        <button className="btn" type="button" onClick={onNext} disabled={disabled} title="Next email">
          Next <ChevronRight size={16} />
        </button>
        <button className="btn" type="button" onClick={runAll} disabled={disabled} title="Run all test emails">
          <Play size={16} /> Run all
        </button>
      </div>

      <div className="qp-chips" role="listbox" aria-label="Quick pick test emails">
        {TEST_EMAILS.map((em) => (
          <button
            key={em}
            role="option"
            aria-selected={value === em}
            className={`chip ${value === em ? 'chip-active' : ''}`}
            onClick={() => { setValue(em); onApplyEmail(em); }}
            disabled={disabled}
            title={em}
          >
            {em}
          </button>
        ))}
      </div>

      <style jsx>{`
        .qp-wrap { display: grid; gap: 8px }
        .qp-controls { display: inline-flex; gap: 8px; flex-wrap: wrap }
        .qp-chips { display: flex; gap: 6px; overflow: auto; padding-bottom: 2px; }
        .chip {
          display: inline-flex; align-items: center;
          border: 1px solid var(--border);
          background: var(--muted);
          color: var(--text);
          padding: 6px 8px; border-radius: 999px;
          font-size: 12px; white-space: nowrap; cursor: pointer;
        }
        .chip-active {
          background: var(--brand);
          border-color: var(--brand-600);
          color: #fff;
        }
      `}</style>
    </div>
  );
}