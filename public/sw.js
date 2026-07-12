// Service Worker for Liftly Rest Timer
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

let timeoutId = null;
let countdownIntervalId = null;
let targetEndTime = null;
let targetTotalDuration = null;
let activeCountdownResolver = null;

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.action === 'startCountdown') {
    const { endTime, totalDuration } = data;
    targetEndTime = endTime;
    targetTotalDuration = totalDuration;

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
    }
    if (activeCountdownResolver) {
      activeCountdownResolver();
      activeCountdownResolver = null;
    }

    const promise = new Promise((resolve) => {
      activeCountdownResolver = resolve;

      const updateCountdown = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((targetEndTime - now) / 1000));

        if (remaining <= 0) {
          if (countdownIntervalId) {
            clearInterval(countdownIntervalId);
            countdownIntervalId = null;
          }
          // Close the progress notification before showing the completion one
          self.registration.getNotifications({ tag: 'rest-timer' }).then((ns) => ns.forEach((n) => n.close()));
          showNotification('Rest Over!', "Time for your next set. Let's lift!", true, 'rest-timer-complete');
          resolve();
          activeCountdownResolver = null;
        } else {
          const bar = getProgressBar(remaining, targetTotalDuration);
          const bodyText = bar ? `${formatTime(remaining)} remaining  [${bar}]` : `${formatTime(remaining)} remaining`;
          showNotification('Resting...', bodyText, false, 'rest-timer');
        }
      };

      updateCountdown();
      countdownIntervalId = setInterval(updateCountdown, 1000);
    });

    event.waitUntil(promise);
  } else if (data.action === 'scheduleNotification') {
    const { title, body, delay } = data;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
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
    // Cancel only the countdown progress — leave the completion notification alone
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
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
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
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

function getProgressBar(remaining, total) {
  if (!total || total <= 0) return '';
  const percentDone = (total - remaining) / total;
  const filled = Math.min(10, Math.max(0, Math.round(percentDone * 10)));
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
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
