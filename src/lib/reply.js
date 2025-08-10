import { trim } from './strings.js';

export function pickLast3Titles(posts) {
  if (!Array.isArray(posts)) return [];
  const sorted = [...posts].sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  return sorted.slice(0, 3).map((p) => p.title || '');
}

export function genReply({ tone = 'friendly', ticket, user, posts }) {
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