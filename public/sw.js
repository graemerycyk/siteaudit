// This is the service worker with the combined offline experience (Offline page + Offline copy of pages)

const CACHE = "siteaudit-offline-v1";

// List of essential resources to cache for offline use
const ESSENTIAL_RESOURCES = [
  '/',
  '/audit',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install stage sets up the offline page in the cache and opens a new cache
self.addEventListener('install', function(event) {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(CACHE).then(function(cache) {
      console.log('[ServiceWorker] Caching essential resources');
      return cache.addAll(ESSENTIAL_RESOURCES);
    })
  );
  
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== CACHE) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  
  return self.clients.claim();
});

// If any fetch fails, it will look for the request in the cache and serve it from there first
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  
  // For non-API requests, try the cache first, then fall back to network
  if (!event.request.url.includes('/api/')) {
    event.respondWith(
      fromCache(event.request).then(
        function(response) {
          // The response was found in the cache so we respond with it
          console.log('[ServiceWorker] Found in Cache', event.request.url);
          
          // Update the cache asynchronously
          event.waitUntil(
            fetch(event.request).then(function(response) {
              return updateCache(event.request, response);
            })
          );
          
          return response;
        },
        function() {
          // The response was not found in the cache so we look for it on the server
          return fetch(event.request)
            .then(function(response) {
              // If request was successful, add or update it in the cache
              event.waitUntil(updateCache(event.request, response.clone()));
              return response;
            })
            .catch(function(error) {
              console.log('[ServiceWorker] Network request failed and no cache', error);
              // If both cache and network fail, show a generic fallback
              return caches.match('/offline.html');
            });
        }
      )
    );
  } else {
    // For API requests, try network first, then fall back to cached version if available
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          // If request was successful, add or update it in the cache
          event.waitUntil(updateCache(event.request, response.clone()));
          return response;
        })
        .catch(function() {
          return fromCache(event.request);
        })
    );
  }
});

// Function to get from cache
function fromCache(request) {
  return caches.open(CACHE).then(function(cache) {
    return cache.match(request).then(function(matching) {
      if (!matching || matching.status === 404) {
        return Promise.reject("no-match");
      }
      return matching;
    });
  });
}

// Function to update cache
function updateCache(request, response) {
  return caches.open(CACHE).then(function(cache) {
    return cache.put(request, response);
  });
}

// Listen for the message from the client to skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 