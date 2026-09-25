const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Exactly two Firestore reads per order at most: store + owner's device record.
exports.notifyStoreAdminOfNewOrder = onDocumentCreated('stores/{storeId}/orders/{orderId}', async (event) => {
  const order = event.data?.data();
  if (!order || order.status !== 'pending') return;

  const storeSnapshot = await db.doc(`stores/${event.params.storeId}`).get();
  const ownerUid = storeSnapshot.data()?.ownerUid;
  if (!ownerUid) {
    logger.info('Order without assigned store admin; push skipped.', { storeId: event.params.storeId });
    return;
  }

  const deviceRef = db.doc(`stores/${event.params.storeId}/notificationDevices/${ownerUid}`);
  const deviceSnapshot = await deviceRef.get();
  const token = deviceSnapshot.data()?.token;
  if (!token) return;

  try {
    await admin.messaging().send({
      token,
      notification: { title: 'Nuevo pedido', body: 'Revisa la cola operativa.' },
      data: { storeId: event.params.storeId, orderId: event.params.orderId, type: String(order.type || '') },
      webpush: { fcmOptions: { link: `/t/${storeSnapshot.data()?.slug || ''}/admin` } },
    });
  } catch (error) {
    // Invalid tokens should not trigger retries or repeated reads on later orders.
    if (error?.code === 'messaging/registration-token-not-registered' || error?.code === 'messaging/invalid-registration-token') {
      await deviceRef.delete();
      return;
    }
    logger.error('FCM notification failed.', error);
  }
});
