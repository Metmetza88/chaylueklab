// GitHub Pages is the existing LIFF endpoint; the custom domain keeps its storefront.
export function lifeOsEntry(href) {
  const current = new URL(href);
  const isPages = current.hostname === 'metmetza88.github.io' && current.pathname === '/chaylueklab/';
  const isCallback = current.searchParams.has('liff.state') || current.searchParams.has('liffClientId');
  if (!isPages && !isCallback) return null;
  const target = new URL('./app-20261007.html', current);
  target.search = current.search;
  target.hash = current.hash;
  return target.href;
}
if (typeof window !== 'undefined') {
  const target = lifeOsEntry(location.href);
  if (target) location.replace(target);
}
