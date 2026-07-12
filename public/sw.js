// Service Worker for Liftly Rest Timer
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

let timeoutId = null;

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.action === 'scheduleNotification') {
    const { title, body, delay } = data;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (delay <= 0) {
      showNotification(title, body);
      return;
    }

    // Best-effort background notification trigger
    timeoutId = setTimeout(() => {
      showNotification(title, body);
      timeoutId = null;
    }, delay);
  } else if (data.action === 'cancelNotification') {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach((notification) => {
        if (notification.tag === 'rest-timer') {
          notification.close();
        }
      });
    });
  }
});

function showNotification(title, body) {
  self.registration.showNotification(title, {
    body: body,
    icon: '/icon.png',
    tag: 'rest-timer',
    renotify: true,
    vibrate: [200, 100, 200],
    requireInteraction: true
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
