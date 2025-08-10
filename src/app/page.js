'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Mail, User, Building2, MapPin, Globe, RefreshCw, Copy,
  Bot, Info, ListOrdered, CheckCircle2
} from 'lucide-react';

import Toolbar from '@/components/Toolbar.jsx';
import StateInfo from '@/components/StateInfo.jsx';
import { TicketSkeleton, CustomerSkeleton } from '@/components/Skeletons.jsx';
import MissingEmailPanel from '@/components/MissingEmailPanel.jsx';
import Toast from '@/components/Toast.jsx';

import { loadZAF } from '@/lib/zaf.js';
import { fetchJSON, fetchUserByEmail } from '@/lib/api.js';
import { genReply, pickLast3Titles } from '@/lib/reply.js';
import { trim } from '@/lib/strings.js';
import { API_BASE, emailRegex, sanitizeEmail } from '@/lib/constants.js';

export default function App() {
  // zafEnv: 'unknown' | 'zaf' | 'local'
  const [zafEnv, setZafEnv] = useState('unknown');
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

  // Restore last manual email (local mode convenience)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zsa_manual_email');
      if (saved) setManualEmail(saved);
    } catch {}
  }, []);

  // Core flow
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
          const fields = await client.get([
            'ticket.requester.email',
            'ticket.subject',
            'ticket.description'
          ]);
          // Mark we are truly in ZAF only after a successful client.get
          setClientReady(true);
          setZafEnv('zaf');

          t = {
            email: fields['ticket.requester.email'] || '',
            subject: fields['ticket.subject'] || '',
            description: fields['ticket.description'] || ''
          };
        } catch {
          // ZAF present but not usable; treat as local
          setClientReady(false);
          setZafEnv('local');
        }
      } else {
        // No ZAF available at all (local/dev)
        setClientReady(false);
        setZafEnv('local');
      }

      if (!t) {
        const params = new URLSearchParams(window.location.search);
        t = {
          email: params.get('email') || manualEmail || '',
          subject: params.get('subject') || 'Help with my account',
          description:
            params.get('description') ||
            'I have trouble accessing my dashboard and keep seeing a blank page.'
        };
      }

      if (overrideEmail) t.email = overrideEmail;
      t.email = sanitizeEmail(t.email);
      setTicket(t);

      if (!t.email) {
        // No email available yet: enter Missing state, render helper UI to collect email
        setUser(null);
        setPosts([]);
        setReply(genReply({ tone, ticket: t, user: null, posts: [] }));
        setState('missing');
        return;
      }

      const found = await fetchUserByEmail(API_BASE, t.email, controller.signal);
      if (!found) {
        setUser(null);
        setPosts([]);
        setReply(genReply({ tone, ticket: t, user: null, posts: [] }));
        setState('notfound');
        return;
      }
      setUser(found);

      // Fetch last 3 post titles (non-fatal if it fails)
      let last3 = [];
      try {
        const userPosts = await fetchJSON(
          `${API_BASE}/posts?userId=${encodeURIComponent(found.id)}`,
          controller.signal
        );
        last3 = pickLast3Titles(userPosts);
      } catch {
        last3 = [];
      }
      setPosts(last3);

      setReply(genReply({ tone, ticket: t, user: found, posts: last3 }));
      setState('ready');
    } catch (e) {
      if (e?.name === 'AbortError') return;
      setError(e?.message || 'Unknown error');
      setState('error');
    } finally {
      abortRef.current = null;
      // Ensure env is at least determined
      if (zafEnv === 'unknown') setZafEnv(clientReady ? 'zaf' : 'local');
    }
  }, [manualEmail, tone, zafEnv, clientReady]);

  useEffect(() => {
    readTicket();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [readTicket]);

  // Regenerate reply on tone change
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

  // Shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'r') { e.preventDefault(); readTicket(); }
        if (k === 'g') { e.preventDefault(); setReply(genReply({ tone, ticket, user, posts })); }
        if (k === 'c') { e.preventDefault(); copyToClipboard(); }
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
  const modeReady = zafEnv !== 'unknown';
  const localMode = zafEnv === 'local';

  // Accept optional email to apply directly (used by quick-pick or MissingEmailPanel)
  const applyTestEmail = useCallback((emailMaybe) => {
    const em = sanitizeEmail(emailMaybe || manualEmail);
    if (!em) {
      setEmailError('Please enter a test email');
      return;
    }
    if (!emailRegex.test(em)) {
      setEmailError('Enter a valid email address');
      return;
    }
    try { localStorage.setItem('zsa_manual_email', em); } catch {}
    setManualEmail(em);
    setEmailError('');
    showToast(`Using email: ${em}`);
    // Trigger the full fetch flow for the provided email
    readTicket(em);
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
        // Show email controls if either local mode or we're missing an email
        modeReady={modeReady}
        localMode={localMode || state === 'missing'}
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
          <>
            <StateInfo
              kind="warn"
              title="Requester email missing"
              message="Enter an email below to look up the customer profile and posts."
            />
            <div style={{ marginTop: 10 }}>
              <MissingEmailPanel
                value={manualEmail}
                setValue={setManualEmail}
                onApply={applyTestEmail}
                error={emailError}
                disabled={disabled}
              />
            </div>
          </>
        )}

        {state === 'notfound' && (
          <StateInfo
            kind="warn"
            title="Customer not found"
            message="No user matched this email on the public API. Try a different test email."
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

        {(state === 'ready' || state === 'notfound') && (
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
            disabled={state === 'loading'}
            onClick={() => setReply(genReply({ tone, ticket, user, posts }))}
            aria-label="Regenerate reply"
            title="Regenerate reply (Ctrl/Cmd + G)"
          >
            <RefreshCw size={16} style={{ transform: 'rotate(-90deg)' }} /> Regenerate
          </button>
          <button
            className="btn"
            disabled={state === 'loading' || copying}
            onClick={copyToClipboard}
            aria-label="Copy reply to clipboard"
            title="Copy to clipboard (Ctrl/Cmd + C)"
          >
            <Copy size={16} /> {copying ? 'Copying…' : 'Copy'}
          </button>
          <button
            className="btn"
            disabled={state === 'loading'}
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