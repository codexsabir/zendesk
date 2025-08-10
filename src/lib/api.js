// Adds a safe timeout to every request and keeps the existing fetchJSON signature.

export async function fetchJSON(url, signal, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new DOMException('Timeout', 'AbortError')), timeoutMs);

  // Tie external signal (if any) to our internal controller
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
    }
    return res.json();
  } finally {
    clearTimeout(timeout);
    if (signal) signal.removeEventListener?.('abort', onAbort);
  }
}

/**
 * Fetch user by email with a resilient strategy:
 * 1) Try direct filter (?email=exact)
 * 2) If none, fetch all and match case-insensitively
 */
export async function fetchUserByEmail(apiBase, email, signal) {
  const exact = await fetchJSON(`${apiBase}/users?email=${encodeURIComponent(email)}`, signal);
  if (Array.isArray(exact) && exact[0]) return exact[0];

  const all = await fetchJSON(`${apiBase}/users`, signal);
  const lower = String(email).toLowerCase();
  const found = (all || []).find(u => String(u?.email || '').toLowerCase() === lower);
  return found || null;
}