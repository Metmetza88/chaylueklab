import { newsroomConfig } from '../data/newsroom-config.js';

// Routing only. The existing Life OS and APIs still verify each LINE identity.
export function lifeOsEntryUrl(current, userAgent = '') {
  const url = new URL(current);
  if (url.searchParams.get('site') === '1') return null;
  const appRequest = ['view', 'code', 'liff.state', 'liff.referrer', 'liff.source', 'payment']
    .some(name => url.searchParams.has(name));
  if (!appRequest && !/\bLine\/\d/i.test(userAgent)) return null;
  const target = new URL('app-20261007.html', url);
  target.search = url.search;
  target.hash = url.hash;
  return target.href;
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('[data-line-path]').forEach(link => {
    const path = link.dataset.linePath;
    link.href = `https://liff.line.me/${newsroomConfig.liffId}/${path}`;
  });
  const target = lifeOsEntryUrl(location.href, navigator.userAgent);
  if (target) location.replace(target);
}
