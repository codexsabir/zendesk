export const ZAF_SDK_URL = 'https://static.zdassets.com/zendesk_app_framework_sdk/2.0/zaf_sdk.min.js';
export const API_BASE = 'https://jsonplaceholder.typicode.com';

// Raw list from the prompt (some had spaces); we sanitize below.
export const RAW_TEST_EMAILS = [
  'Sincere@april.biz',
  'Shanna@melissa.tv',
  'Nathan@yesenia.net',
  'Julianne.OConner@kory.org',
  'Lucio_Hettinger@annie.ca',
  'Karley_Dach@jasper.info',
  'Telly. Hoeger@billy.biz',
  'Sherwood@rosamond.me',
  'Chaim_McDermott@dana.io',
  'Rey. Padberg@karina.biz'
];

export const sanitizeEmail = (s = '') => String(s).replace(/\s+/g, '').trim();

// Final test list (sanitized + deduped)
export const TEST_EMAILS = Array.from(
  new Set(RAW_TEST_EMAILS.map(sanitizeEmail))
);

// Basic email pattern for client-side checks (not strict RFC)
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;