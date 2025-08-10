'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Mail, User, Building2, MapPin, Globe, RefreshCw, Copy,
  ShieldAlert, Sparkles, Repeat, Bot, Info, ListOrdered, CheckCircle2, AtSign
} from 'lucide-react';

const ZAF_SDK_URL = 'https://static.zdassets.com/zendesk_app_framework_sdk/2.0/zaf_sdk.min.js';
const API_BASE = 'https://jsonplaceholder.typicode.com';

// Common test emails from JSONPlaceholder (you can type your own too)
const TEST_EMAILS = [
  'Sincere@april.biz',
  'Shanna@melissa.tv',
  'Nathan@yesenia.net',
  'Julianne.OConner@kory.org',
  'Lucio_Hettinger@annie.ca',
  'Karley_Dach@jasper.info',
  'Telly.Hoeger@billy.biz',
  'Sherwood@rosamond.me',
  'Chaim_McDermott@dana.io',
  'Rey.Padberg@karina.biz'
];

function loadZAF() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null);
    if (window.ZAFClient) return resolve(window.ZAFClient);
    const s = document.createElement('script');
    s.src = ZAF_SDK_URL;
    s.async = true;
    s.onload = () => resolve(window.ZAFClient || null);
    s.onerror = () => resolve(null);
    document.body.appendChild(s);
  });
}

function trim(text, max = 240) {
  if (!text) return '';
  const t = String(text);
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

function pickLast3Titles(posts) {
  if (!Array.isArray(posts)) return [];
  const sorted = [...posts].sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  return sorted.slice(0, 3).map((p) => p.title || '');
}

function genReply({ tone = 'friendly', ticket, user, posts }) {
  const name = user?.name || 'there';
  const company = user?.company?.name || 'your company';
  const city = user?.address?.city || '';
  const subj = ticket?.subject || 'your request';
  const desc = trim(ticket?.description || '', 160);

  const last3 = posts?.length ? ` I also glanced at your recent posts (${posts.join('; ')}).` : '';

  if (tone === 'concise') {
    return [
      `Hi ${name},`,
      `Thanks for contacting us about "${subj}".`,
      desc ? `Context noted: ${desc}` : undefined,
      `I’ve reviewed your account for ${company}${city ? ` in ${city}` : ''}.${last3}`,
      `Next steps:`,
      `• I can clarify the issue and propose a fix.`,
      `• Please confirm any extra details or screenshots.`,
      ``,
      `Best,`,
      `Support`
    ].filter(Boolean).join('\n');
  }

  // friendly
  return [
    `Hi ${name},`,
    `Thanks so much for reaching out about “${subj}”.`,
    desc ? `I read your note: ${desc}` : undefined,
    `I took a quick look at your ${company} account${city ? ` in ${city}` : ''}.${last3}`,
    `Here’s what I can do next:`,
    `• Review the details and suggest the quickest fix`,
    `• Share clear steps or make changes on your behalf if needed`,
    ``,
    `If you can, please confirm any extra context or screenshots so I can move faster.`,
    ``,
    `Warm regards,`,
    `Support`
  ].filter(Boolean).join('\n');
}

async function fetchJSON(url, signal) {
  const res = await fetch(url, { signal, headers: { 'Accept': 'application/json' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
  }
  return res.json();
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export default function App() {
  const [clientReady, setClientReady] = useState(false);
  const [ticket, setTicket] = useState({ email: '', subject: '', description: '' });

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [state, setState] = useState('idle'); // idle | loading | ready | error | notfound | missing
  const [error, setError] = useState('');
  const [tone, setTone] = useState('friendly'); // friendly | concise
  const [reply, setReply] = useState('');
  const [copying, setCopying] = useState(false);
  const [toast, setToast] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const toastTimer = useRef(null);
  const abortRef = useRef(null);

  // Restore last manual email for faster testing
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zsa_manual_email');
      if (saved) setManualEmail(saved);
    } catch {}
  }, []);

  // Read ticket data via ZAF if possible, else fallback to URL params or mock.
  // Optionally override with a provided email (manual testing mode).
  const readTicket = useCallback(async (overrideEmail) => {
    setState('loading');
    setError('');

    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const ZAF = await loadZAF();
      let t = null;

      if (ZAF) {
        try {
          const client = ZAF.init();
          setClientReady(true);
          const fields = await client.get([
            'ticket.requester.email',
            'ticket.subject',
            'ticket.description'
          ]);
          t = {
            email: fields['ticket.requester.email'] || '',
            subject: fields['ticket.subject'] || '',
            description: fields['ticket.description'] || ''
          };
        } catch {
          // Fall through to local mode
        }
      }

      if (!t) {
        // No ZAF (local dev). Use URL params or sensible defaults
        const params = new URLSearchParams(window.location.search);
        t = {
          email: params.get('email') || manualEmail || 'Sincere@april.biz',
          subject: params.get('subject') || 'Help with my account',
          description:
            params.get('description') ||
            'I have trouble accessing my dashboard and keep seeing a blank page.'
        };
      }

      // Apply explicit override (from Test Email control)
      if (overrideEmail) {
        t.email = overrideEmail;
      }

      setTicket(t);

      if (!t.email) {
        setUser(null);
        setPosts([]);
        setReply(genReply({ tone, ticket: t, user: null, posts: [] }));
        setState('missing');
        return;
      }

      // Fetch user by email
      const userList = await fetchJSON(
        `${API_BASE}/users?email=${encodeURIComponent(t.email)}`,
        controller.signal
      );
      const found = Array.isArray(userList) && userList[0] ? userList[0] : null;
      if (!found) {
        setUser(null);
        setPosts([]);
        setReply(genReply({ tone, ticket: t, user: null, posts: [] }));
        setState('notfound');
        return;
      }
      setUser(found);

      // Fetch last 3 post titles
      const userPosts = await fetchJSON(
        `${API_BASE}/posts?userId=${encodeURIComponent(found.id)}`,
        controller.signal
      );
      const last3 = pickLast3Titles(userPosts);
      setPosts(last3);

      setReply(genReply({ tone, ticket: t, user: found, posts: last3 }));
      setState('ready');
    } catch (e) {
      if (e?.name === 'AbortError') return;
      setError(e?.message || 'Unknown error');
      setState('error');
    } finally {
      abortRef.current = null;
    }
  }, [manualEmail, tone]);

  useEffect(() => {
    readTicket();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [readTicket]);

  // Regenerate reply when tone changes and we have data
  useEffect(() => {
    if (state === 'ready' || state === 'notfound' || state === 'missing') {
      setReply(genReply({ tone, ticket, user, posts }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tone]);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2000);
  };

  const copyToClipboard = useCallback(async () => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(reply || '');
      showToast('Copied reply to clipboard');
    } catch {
      showToast('Copy failed. Select text and press Ctrl/Cmd+C.');
    } finally {
      setCopying(false);
    }
  }, [reply]);

  // Keyboard shortcuts for power users
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'r') { e.preventDefault(); readTicket(); }
        if (e.key.toLowerCase() === 'g') { e.preventDefault(); setReply(genReply({ tone, ticket, user, posts })); }
        if (e.key.toLowerCase() === 'c') { e.preventDefault(); copyToClipboard(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [copyToClipboard, readTicket, tone, ticket, user, posts]);

  const summaryItems = useMemo(() => ([
    { icon: Mail, label: 'Email', value: ticket.email || '—' },
    { icon: Info, label: 'Subject', value: trim(ticket.subject || '—', 120) },
    { icon: Bot, label: 'Description', value: trim(ticket.description || '—', 220) }
  ]), [ticket]);

  const disabled = state === 'loading';
  const localMode = !clientReady;

  const applyTestEmail = useCallback(() => {
    if (!manualEmail) {
      setEmailError('Please enter a test email');
      return;
    }
    if (!emailRegex.test(manualEmail)) {
      setEmailError('Enter a valid email address');
      return;
    }
    try { localStorage.setItem('zsa_manual_email', manualEmail); } catch {}
    setEmailError('');
    showToast(`Using test email: ${manualEmail}`);
    readTicket(manualEmail);
  }, [manualEmail, readTicket]);

  return (
    <div className="app">
      <header className="appbar" role="banner">
        <div className="brand">
          <img src="/window.svg" alt="" width="18" height="18" />
          <strong>Public API Assistant</strong>
        </div>
        <div className="grow" />
        <div className="status">
          <span className={`chip ${clientReady ? 'chip-ok' : 'chip-muted'}`} aria-live="polite">
            <CheckCircle2 size={14} /> {clientReady ? 'ZAF connected' : 'Local mode'}
          </span>
        </div>
      </header>

      <Toolbar
        tone={tone}
        setTone={setTone}
        onRefresh={() => readTicket()}
        loading={state === 'loading'}
        localMode={localMode}
        manualEmail={manualEmail}
        setManualEmail={setManualEmail}
        onApplyEmail={applyTestEmail}
        emailError={emailError}
      />

      <section className="card" aria-labelledby="ticketHeading" aria-busy={state === 'loading'}>
        <h2 id="ticketHeading" className="card-title">Ticket</h2>
        <div className="row">
          {state === 'loading' ? (
            <TicketSkeleton />
          ) : (
            <div className="row">
              {summaryItems.map(({ icon: Icon, label, value }) => (
                <div className="kv" key={label}>
                  <div className="label"><Icon size={14} aria-hidden="true" /> {label}</div>
                  <div className="value" title={String(value)}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="card" aria-labelledby="customerHeading" aria-busy={state === 'loading'}>
        <h2 id="customerHeading" className="card-title">Customer</h2>

        {state === 'loading' && <CustomerSkeleton />}

        {state === 'missing' && (
          <StateInfo
            kind="warn"
            title="Requester email missing"
            message="Cannot look up a customer without an email address."
          />
        )}

        {state === 'notfound' && (
          <StateInfo
            kind="warn"
            title="Customer not found"
            message="No user matched this email on the public API."
          />
        )}

        {state === 'error' && (
          <StateInfo
            kind="error"
            title="API error"
            message={error || 'Something went wrong while fetching data.'}
            actionLabel="Retry"
            onAction={() => readTicket()}
          />
        )}

        {(state === 'ready' || state === 'notfound' || state === 'missing') && (
          <div className="row cols-2">
            <div>
              <div className="badge"><User size={14} aria-hidden="true" /> {user?.name || '—'}</div>
              <div className="kv" style={{ marginTop: 8 }}>
                <div className="label"><Building2 size={14} aria-hidden="true" /> Company</div>
                <div className="value">{user?.company?.name || '—'}</div>

                <div className="label"><MapPin size={14} aria-hidden="true" /> City</div>
                <div className="value">{user?.address?.city || '—'}</div>

                <div className="label"><Globe size={14} aria-hidden="true" /> Website</div>
                <div className="value">{user?.website || '—'}</div>
              </div>
            </div>

            <div>
              <div className="badge"><ListOrdered size={14} aria-hidden="true" /> Last 3 posts</div>
              {posts?.length ? (
                <ol className="list">
                  {posts.map((t, i) => (<li key={i}>{t}</li>))}
                </ol>
              ) : (
                <p className="small" style={{ marginTop: 8 }}>No posts to show.</p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="replyHeading">
        <h2 id="replyHeading" className="card-title">Reply draft</h2>
        <div className="btn-row" style={{ marginBottom: 8 }}>
          <button
            className="btn"
            disabled={disabled}
            onClick={() => setReply(genReply({ tone, ticket, user, posts }))}
            aria-label="Regenerate reply"
            title="Regenerate reply (Ctrl/Cmd + G)"
          >
            <Repeat size={16} /> Regenerate
          </button>
          <button
            className="btn"
            disabled={disabled || copying}
            onClick={copyToClipboard}
            aria-label="Copy reply to clipboard"
            title="Copy to clipboard (Ctrl/Cmd + C)"
          >
            <Copy size={16} /> {copying ? 'Copying…' : 'Copy'}
          </button>
          <button
            className="btn"
            disabled={disabled}
            onClick={() => readTicket()}
            aria-label="Refresh data"
            data-busy={state === 'loading' ? 'true' : 'false'}
            title="Refresh data (Ctrl/Cmd + R)"
          >
            <RefreshCw className="rotate-if-busy" size={16} /> Refresh
          </button>
        </div>
        <textarea
          className="reply"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Reply will appear here…"
          aria-label="Reply draft"
        />
        <div className="small" style={{ marginTop: 6 }}>
          Tip: You can edit the draft above before copying.
        </div>
      </section>

      <footer className="foot small" role="contentinfo">
        Tone: <strong>{tone}</strong> · State: <strong>{state}</strong>
      </footer>

      <Toast message={toast} />
    </div>
  );
}

function Toolbar({
  tone, setTone, onRefresh, loading,
  localMode, manualEmail, setManualEmail, onApplyEmail, emailError
}) {
  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onApplyEmail();
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

      {localMode && (
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
            />
            <datalist id="testEmails">
              {TEST_EMAILS.map((em) => <option key={em} value={em} />)}
            </datalist>
            <button className="btn" type="button" onClick={onApplyEmail} title="Fetch user for this email">
              Fetch
            </button>
          </div>
          {emailError ? <div className="field-help error">{emailError}</div> : (
            <div className="field-help">Local mode only. Choose from presets or type any email, then press Fetch.</div>
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

function StateInfo({ kind = 'warn', title, message, actionLabel, onAction }) {
  const Icon = kind === 'error' ? ShieldAlert : Info;

  return (
    <div className={`alert ${kind === 'error' ? 'alert-error' : 'alert-warn'}`} role="status" aria-live="polite">
      <div className="alert-title"><Icon size={16} aria-hidden="true" /> {title}</div>
      <div className="alert-msg">{message}</div>
      {actionLabel && onAction && (
        <div className="alert-actions">
          <button className="btn" onClick={onAction}>
            <RefreshCw size={16} /> {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function TicketSkeleton() {
  return (
    <>
      <div className="skel line lg" />
      <div className="skel line" />
      <div className="skel line" />
    </>
  );
}

function CustomerSkeleton() {
  return (
    <div className="row cols-2">
      <div>
        <div className="skel line" style={{ width: '60%', height: 20, borderRadius: 10 }} />
        <div className="skel line" />
        <div className="skel line sm" />
        <div className="skel line" />
      </div>
      <div>
        <div className="skel line" />
        <div className="skel line sm" />
        <div className="skel line" />
      </div>
    </div>
  );
}

function Toast({ message }) {
  return (
    <>
      <div className="sr-only" aria-live="polite" role="status">{message}</div>
      {message ? (
        <div className="toast">
          {message}
        </div>
      ) : null}
    </>
  );
}