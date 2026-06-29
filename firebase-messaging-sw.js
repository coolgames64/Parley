/* Parley — Firebase Cloud Messaging background handler.
   Receives "incoming call" pushes when the app is closed/backgrounded and
   shows a notification that opens Parley straight into the call.
   NOTE: paste the SAME Firebase config values you used in index.html. */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const callId = payload.data && payload.data.callId;
  const title = (payload.notification && payload.notification.title) || "Incoming call";
  const body  = (payload.notification && payload.notification.body)  || "Tap to join the translated call";
  self.registration.showNotification(title, {
    body,
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: "parley-call-" + (callId || "x"),
    requireInteraction: true,
    data: { url: callId ? ("/?call=" + callId) : "/" }
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) { c.navigate(url); return c.focus(); } }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
