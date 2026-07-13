// Service Worker for Liftly Rest Timer
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

let timeoutId = null;
let targetEndTime = null;
let activeCountdownResolver = null;

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.action === 'startCountdown') {
    targetEndTime = data.endTime;

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (activeCountdownResolver) {
      activeCountdownResolver();
      activeCountdownResolver = null;
    }

    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((targetEndTime - now) / 1000));

    if (remaining <= 0) {
      // Already expired — show completion immediately
      const p = showNotification('Rest Over!', "Time for your next set. ", true, 'rest-timer-complete');
      if (p) event.waitUntil(p);
      return;
    }

    // Show a single static notification — no per-second updates
    showNotification('Resting...', `${formatTime(remaining)} timer active`, false, 'rest-timer');

    // Schedule a timeout to fire the completion notification when the timer ends
    const promise = new Promise((resolve) => {
      activeCountdownResolver = resolve;
      const delay = targetEndTime - now;

      timeoutId = setTimeout(() => {
        timeoutId = null;
        // Close the static progress notification before showing completion
        self.registration.getNotifications({ tag: 'rest-timer' }).then((ns) => ns.forEach((n) => n.close()));
        showNotification('Rest Over!', "Time for your next set. ", true, 'rest-timer-complete');
        resolve();
        activeCountdownResolver = null;
      }, delay);
    });

    event.waitUntil(promise);
  } else if (data.action === 'scheduleNotification') {
    const { title, body, delay } = data;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (activeCountdownResolver) {
      activeCountdownResolver();
      activeCountdownResolver = null;
    }

    if (delay <= 0) {
      const p = showNotification(title, body, true);
      if (p) event.waitUntil(p);
      return;
    }

    // Best-effort background notification trigger
    const promise = new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        const p = showNotification(title, body, true);
        if (p) {
          p.then(resolve).catch(resolve);
        } else {
          resolve();
        }
        timeoutId = null;
      }, delay);
    });
    event.waitUntil(promise);
  } else if (data.action === 'cancelCountdown') {
    // Cancel the scheduled completion timeout — leave any completion notification alone
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (activeCountdownResolver) {
      activeCountdownResolver();
      activeCountdownResolver = null;
    }
    const cancelProgressPromise = self.registration.getNotifications({ tag: 'rest-timer' }).then((notifications) => {
      notifications.forEach((n) => n.close());
    });
    event.waitUntil(cancelProgressPromise);
  } else if (data.action === 'cancelNotification') {
    // Cancel everything: countdown, scheduled timeouts, and all notifications
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (activeCountdownResolver) {
      activeCountdownResolver();
      activeCountdownResolver = null;
    }
    const cancelPromise = self.registration.getNotifications().then((notifications) => {
      notifications.forEach((notification) => {
        if (notification.tag === 'rest-timer' || notification.tag === 'rest-timer-complete') {
          notification.close();
        }
      });
    });
    event.waitUntil(cancelPromise);
  }
});

function formatTime(secs) {
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return (mins < 10 ? '0' + mins : mins) + ':' + (s < 10 ? '0' + s : s);
}

function showNotification(title, body, alertUser, tag) {
  const options = {
    body: body,
    icon: '/icon.png',
    tag: tag || 'rest-timer',
    renotify: !!alertUser,
    silent: !alertUser,
    requireInteraction: !!alertUser
  };

  if (alertUser) {
    options.vibrate = [200, 100, 200];
    options.actions = [
      { action: 'open_app', title: 'Open Liftly' }
    ];
  }

  return self.registration.showNotification(title, options);
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
