// Keep the canonical GitHub Pages LIFF entry on personal Life OS.
// Ordinary visits to the custom brand domain and Vercel previews open the
// existing shop & services page instead of unexpectedly entering Life OS.
export function appEntryUrl(href) {
  const current = new URL(href);
  const isPagesEntry = current.hostname === 'metmetza88.github.io' &&
    /^\/chaylueklab\/(?:index\.html)?$/.test(current.pathname);
  const isLiffCallback = current.searchParams.has('liff.state') ||
    current.searchParams.has('liffClientId') ||
    (current.searchParams.has('code') && current.searchParams.has('state'));
  const isWorkspaceLink = current.searchParams.has('view');
  const page = isPagesEntry || isLiffCallback || isWorkspaceLink
    ? './app-20261007.html'
    : './business.html';
  const target = new URL(page, current);
  target.search = current.search;
  target.hash = current.hash;
  return target.href;
}

if (typeof window !== 'undefined') {
  location.replace(appEntryUrl(location.href));
}
