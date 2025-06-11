const CACHE_NAME = 'tarpu-yachay-v1.0.0';
const OFFLINE_URL = './offline.html';

// Archivos esenciales para cachear
const CORE_FILES = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/components/wizard.js',
    './js/utils/storage.js',
    './js/utils/validation.js',
    './manifest.json',
    '/assets/icons/icon-192.png',
    '/assets/icons/icon-512.png'
];

// Recursos adicionales para cachear bajo demanda
const CACHE_PATTERNS = [
    /\.(?:js|css|html|png|jpg|jpeg|webp|svg|woff2)$/,
    /\/api\/.*$/
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: Instalando...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Service Worker: Cacheando archivos core...');
                return cache.addAll(CORE_FILES);
            })
            .then(() => {
                console.log('✅ Service Worker: Instalado correctamente');
                // Forzar activación inmediata
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('❌ Service Worker: Error en instalación:', error);
            })
    );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker: Activando...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                // Eliminar caches antiguos
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('🗑️ Service Worker: Eliminando cache antiguo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker: Activado correctamente');
                // Tomar control de todas las páginas inmediatamente
                return self.clients.claim();
            })
    );
});

// Interceptar requests
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Solo manejar requests HTTP/HTTPS
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Manejo especial para GitHub Pages
    if (url.origin !== location.origin) {
        return;
    }
    
    // Estrategia diferente según el tipo de recurso
    if (request.destination === 'image') {
        event.respondWith(handleImageRequest(request));
    } else if (request.url.includes('/api/')) {
        event.respondWith(handleAPIRequest(request));
    } else {
        event.respondWith(handleGeneralRequest(request));
    }
});

// Manejo de imágenes - Cache First
async function handleImageRequest(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('📷 Service Worker: Error cargando imagen, usando placeholder');
        // Retornar imagen placeholder si falla
        return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#E8F5E8"/><text x="100" y="100" text-anchor="middle" fill="#2E7D32">🌱</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
        );
    }
}

// Manejo de API - Network First con fallback
async function handleAPIRequest(request) {
    try {
        // Intentar red primero
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cachear respuestas exitosas de GET
            if (request.method === 'GET') {
                const cache = await caches.open(CACHE_NAME);
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        }
        
        throw new Error('Network response not ok');
        
    } catch (error) {
        // Fallback a cache solo para GET requests
        if (request.method === 'GET') {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
                return cachedResponse;
            }
        }
        
        // Respuesta offline para APIs
        return new Response(
            JSON.stringify({
                error: 'offline',
                message: 'No hay conexión disponible'
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Manejo general - Cache First con Network Fallback
async function handleGeneralRequest(request) {
    try {
        // Verificar cache primero
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Si no está en cache, intentar red
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cachear si es un recurso estático
            const shouldCache = CACHE_PATTERNS.some(pattern => 
                pattern.test(request.url)
            );
            
            if (shouldCache) {
                const cache = await caches.open(CACHE_NAME);
                cache.put(request, networkResponse.clone());
            }
        }
        
        return networkResponse;
        
    } catch (error) {
        // Fallback offline para navegación
        if (request.mode === 'navigate') {
            const offlineResponse = await caches.match(OFFLINE_URL);
            if (offlineResponse) {
                return offlineResponse;
            }
        }
        
        throw error;
    }
}

// Manejo de Background Sync (para cuando vuelva la conexión)
self.addEventListener('sync', (event) => {
    console.log('🔄 Service Worker: Background sync:', event.tag);
    
    if (event.tag === 'sync-seeds') {
        event.waitUntil(syncOfflineSeeds());
    }
});

// Sincronizar semillas guardadas offline
async function syncOfflineSeeds() {
    try {
        console.log('📤 Service Worker: Sincronizando semillas offline...');
        
        // Notificar a la app principal para que maneje la sync
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'BACKGROUND_SYNC',
                payload: { action: 'sync-seeds' }
            });
        });
        
    } catch (error) {
        console.error('❌ Service Worker: Error en background sync:', error);
    }
}

// Manejo de notificaciones push (para futuro)
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/assets/icons/icon-192.png',
        badge: '/assets/icons/badge-72.png',
        vibrate: [100, 50, 100],
        data: data.data,
        actions: data.actions || []
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Manejo de clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow(event.notification.data?.url || '/')
    );
});
