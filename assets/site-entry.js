export function appEntryUrl(href,userAgent='') {
 const url=new URL(href);const params=url.searchParams;
 const entered=params.has('liff.state')||params.has('liff.referrer')||params.has('view')||/\bLine\//i.test(userAgent);
 if(!entered)return null;
 const next=new URL('./app-20261007.html',url);next.search=url.search;next.hash=url.hash;return next.href;
}
if(typeof window!=='undefined'){
 const destination=appEntryUrl(location.href,navigator.userAgent);
 if(destination)location.replace(destination);
}
