const CACHE = 'santuario-gestao-v1-5-1-session-isolation';
const ASSETS = [
  './', './index.html', './tesouraria-login.html', './tesouraria-verificacao.html', './tesouraria-painel.html', './tesouraria-interna.html', './tesouraria-interna-operacao.html', './tesouraria-externa.html', './tesouraria-extrato.html', './manifest.webmanifest',
  './assets/css/app.css', './assets/css/tesouraria.css', './assets/css/treasury-report.css',
  './assets/js/web-sync.js', './assets/js/data.js', './assets/js/currency-mask.js', './assets/js/form-fields.js', './assets/js/app.js', './assets/js/treasury-common.js', './assets/js/treasury-login.js', './assets/js/treasury-verificacao.js', './assets/js/treasury-panel.js', './assets/js/treasury-internal.js', './assets/js/treasury-internal-operation.js', './assets/js/treasury-external.js', './assets/js/treasury-report.js',
  './assets/images/cracha-modelo-oficial-referencia.png', './assets/icons/favicon.svg', './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/images/adoradores-logo-documental.png', './assets/images/certificado-batismo-oficial-base.png', './assets/images/certificado-batismo-oficial-referencia.png', './assets/images/certificado-uniao-oficial-base.png', './assets/images/certificado-uniao-oficial-referencia.png'
];
self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).pathname.startsWith('/api/')) return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html'))));
});
