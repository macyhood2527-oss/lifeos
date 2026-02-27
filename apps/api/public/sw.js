self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "LifeOS", body: event.data ? event.data.text() : "You have a reminder." };
  }

  var title = data.title || "LifeOS";
  var options = {
    body: data.body || "You have a reminder.",
    tag: data.tag || "lifeos",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = (event.notification && event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(self.clients.openWindow(url));
});