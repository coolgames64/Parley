/**
 * Parley — call notification function.
 * Fires when a call document is created and pushes an "incoming call"
 * notification to the callee's device (so they're alerted even when the
 * Parley app is closed). Deploy with:  firebase deploy --only functions
 */
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

exports.ringOnCall = onDocumentCreated("calls/{callId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const call = snap.data();
  if (!call || call.status !== "ringing" || !call.calleeUid) return;

  // look up the callee's push token
  const userSnap = await getFirestore().doc(`users/${call.calleeUid}`).get();
  const token = userSnap.exists ? userSnap.get("fcmToken") : null;
  if (!token) return;

  const callId = event.params.callId;
  try {
    await getMessaging().send({
      token,
      notification: {
        title: `${call.callerName || "Someone"} is calling`,
        body: "Tap to join the translated call",
      },
      data: { callId, type: "incoming_call" },
      webpush: {
        headers: { Urgency: "high", TTL: "60" },
        notification: { requireInteraction: true, icon: "/icon-192.png" },
        fcmOptions: { link: `/?call=${callId}` },
      },
    });
  } catch (err) {
    // stale token, etc. — clear it so future sends don't keep failing
    if (
      err.code === "messaging/registration-token-not-registered" ||
      err.code === "messaging/invalid-registration-token"
    ) {
      await getFirestore().doc(`users/${call.calleeUid}`).update({ fcmToken: null });
    }
    console.error("ringOnCall send failed:", err.message);
  }
});
