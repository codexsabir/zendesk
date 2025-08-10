export function trim(text, max = 240) {
  if (!text) return '';
  const t = String(text);
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}