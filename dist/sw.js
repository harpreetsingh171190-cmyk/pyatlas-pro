'use strict';
const PREFIX='pyatlas-shell-', CACHE=PREFIX+encodeURIComponent(self.registration.scope)+'-4b41aac2658bb9de';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const ownScope=self.registration.scope;
  // CacheStorage is origin-wide: scope-specific names prevent deleting another install.
  for(const key of await caches.keys())if(key.startsWith(PREFIX+encodeURIComponent(ownScope)+'-')&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url), scope=new URL(self.registration.scope);
  if(event.request.method!=='GET'||url.origin!==scope.origin||!url.href.startsWith(scope.href))return;
  const relative=url.pathname.slice(scope.pathname.length);
  if(!['','index.html','manifest.webmanifest','icon-192.png','icon-512.png'].includes(relative))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE),key=new URL(relative||'index.html',scope);
    return (await cache.match(key.href)) || fetch(event.request);
  })());
});
