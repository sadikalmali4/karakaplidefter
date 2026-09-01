/* Kara Kaplı Defter — servis çalışanı (PWA kabuğu)
 *
 * KURAL: yalnız UYGULAMA KABUĞU önbelleğe alınır (html, ikon, manifest).
 * Supabase'e giden hiçbir istek önbelleğe ALINMAZ:
 *   · eski skor göstermek gerçek bir hata olur,
 *   · oturum/kimlik yanıtlarını diske yazmak güvenlik açığıdır.
 *
 * Uygulamayı güncelledikten sonra SURUM'u bir artır; eski önbellek silinir.
 */
const SURUM = 'kkd-v4-1';
const KABUK = [
  './',
  './index.html',
  './manifest.json',
  './ikon-192.png',
  './ikon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SURUM)
      .then(c => c.addAll(KABUK))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())     // bir dosya eksikse kurulum yine de bitsin
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(adlar => Promise.all(adlar.filter(a => a !== SURUM).map(a => caches.delete(a))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const istek = e.request;
  if (istek.method !== 'GET') return;

  const url = new URL(istek.url);
  const kendiAlanim = url.origin === self.location.origin;

  // Supabase / diğer alanlar: dokunma. (supabase-js CDN'i de her seferinde ağdan.)
  if (!kendiAlanim) return;

  // Sayfa ve index.html: ÖNCE AĞ — güncellemeyi kaçırmamak için.
  const sayfaMi = istek.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  if (sayfaMi) {
    e.respondWith(
      fetch(istek)
        .then(y => {
          const kopya = y.clone();
          caches.open(SURUM).then(c => c.put('./index.html', kopya)).catch(() => {});
          return y;
        })
        .catch(() => caches.match('./index.html').then(y => y || Response.error()))
    );
    return;
  }

  // İkon / manifest gibi durağan dosyalar: ÖNCE ÖNBELLEK.
  e.respondWith(
    caches.match(istek).then(y => y || fetch(istek).then(a => {
      const kopya = a.clone();
      caches.open(SURUM).then(c => c.put(istek, kopya)).catch(() => {});
      return a;
    }))
  );
});
