// ═══════════════════════════════════════════════
// 🚀 Service Worker - PWA
// منصة الدروس الجامعية - كلية العلوم الإسلامية
// ═══════════════════════════════════════════════
// ⚠️ مهم: عند أي تعديل، زيّد رقم الإصدار!
// ═══════════════════════════════════════════════

const VERSION = 'v1.0.0';
const CACHE_NAME = `islamic-lessons-${VERSION}`;
const STATIC_CACHE = `islamic-lessons-static-${VERSION}`;
const DYNAMIC_CACHE = `islamic-lessons-dynamic-${VERSION}`;

// الملفات الأساسية للتخزين المؤقت
const STATIC_FILES = [
  '/',
  '/index.html',
  '/favorites.html',
  '/contact.html',
  '/teacher.html',
  '/student.html',
  '/style.css',
  '/data.js',
  '/app.js',
  '/manifest.json'
];

// ═══════════════════════════════════════════════
// 📥 التثبيت
// ═══════════════════════════════════════════════
self.addEventListener('install', (event) => {
  console.log(`🔧 تثبيت Service Worker ${VERSION}...`);
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 تخزين الملفات الأساسية');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('✅ تم التثبيت');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('❌ خطأ في التثبيت:', err);
      })
  );
});

// ═══════════════════════════════════════════════
// 🔄 التحديث
// ═══════════════════════════════════════════════
self.addEventListener('activate', (event) => {
  console.log(`🔧 تفعيل Service Worker ${VERSION}...`);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // احذف كل الذاكرات القديمة
            if (!cacheName.includes(VERSION)) {
              console.log('🗑️ حذف الذاكرة القديمة:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ تم التفعيل');
        return self.clients.claim();
      })
  );
});

// ═══════════════════════════════════════════════
// 🌐 الجلب (Fetch)
// ═══════════════════════════════════════════════
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // تجاهل الطلبات الخارجية
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // تجاهل طلبات API - دائماً من الشبكة
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'لا يوجد اتصال بالإنترنت' }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 503
            }
          );
        })
    );
    return;
  }
  
  // ═══════════════════════════════════════════════
  // استراتيجية: Network First (للحصول على أحدث نسخة)
  // ثم Cache
  // ═══════════════════════════════════════════════
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // تخزين النسخة الجديدة
        if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        // لا يوجد إنترنت - استخدم الذاكرة
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // صفحة بديلة
            if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// ═══════════════════════════════════════════════
// 💬 الرسائل
// ═══════════════════════════════════════════════
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log(`✅ Service Worker ${VERSION} محمّل`);