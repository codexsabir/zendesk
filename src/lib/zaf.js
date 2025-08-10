import { ZAF_SDK_URL } from './constants.js';

export function loadZAF() {
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