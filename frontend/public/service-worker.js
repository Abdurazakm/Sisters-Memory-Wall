// 1. Handle Push Notifications (Server-side)
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || "4PlusOne";
  const options = {
    body: data.body || "Time for your daily Dua! ✨",
    icon: "/4PlusOne.png", 
    badge: "/4PlusOne.png", 
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/feed"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 2. Handle Local Reminders (Client-side trigger)
// Refactored to handle emojis and complex strings better
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delay } = event.data;

    // Use a promise-based wait to ensure the service worker stays active
    const notificationPromise = new Promise((resolve) => {
      setTimeout(() => {
        self.registration.showNotification(title, {
          body: body,
          icon: "/4PlusOne.png",
          badge: "/4PlusOne.png",
          vibrate: [100, 50, 100],
          data: { url: "/feed" }
        }).then(resolve);
      }, delay || 0);
    });

    event.waitUntil(notificationPromise);
  }
});

// 3. Smart Click Handler
// Instead of always opening a new window, it focuses the app if it's already open
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const targetUrl = event.notification.data.url || "/";

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if the app is already open in a tab
      for (let client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // If not open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});