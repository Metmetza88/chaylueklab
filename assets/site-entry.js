// The primary LINE endpoint always enters personal Life OS. Business has its own page.
export function appEntryUrl(href) {
 const url=new URL(href);
 const next=new URL('./app-20261007.html',url);next.search=url.search;next.hash=url.hash;return next.href;
}
if(typeof window!=='undefined')location.replace(appEntryUrl(location.href));
