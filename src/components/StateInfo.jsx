import { ShieldAlert, Info } from 'lucide-react';

export default function StateInfo({ kind = 'warn', title, message, actionLabel, onAction }) {
  const Icon = kind === 'error' ? ShieldAlert : Info;

  return (
    <div className={`alert ${kind === 'error' ? 'alert-error' : 'alert-warn'}`} role="status" aria-live="polite">
      <div className="alert-title"><Icon size={16} aria-hidden="true" /> {title}</div>
      <div className="alert-msg">{message}</div>
      {actionLabel && onAction && (
        <div className="alert-actions">
          <button className="btn" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}