const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Exactly two Firestore reads per order at most: store + owner's device record.
const dayMap = { Sunday: 'sunday', Monday: 'monday', Tuesday: 'tuesday', Wednesday: 'wednesday', Thursday: 'thursday', Friday: 'friday', Saturday: 'saturday' };
function storeIsOpen(schedule, timeZone) {
  if (!schedule) return true;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timeZone || 'America/Bogota', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const part = (type) => parts.find((entry) => entry.type === type)?.value || '';
  const entry = schedule[dayMap[part('weekday')]];
  if (!entry || typeof entry === 'string') return true;
  if (entry.closed || !entry.open || !entry.close) return false;
  const now = Number(part('hour')) * 60 + Number(part('minute'));
  const toMinutes = (value) => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };
  return now >= toMinutes(entry.open) && now <= toMinutes(entry.close);
}

exports.createPublicOrder = onCall(async (request) => {
  const { storeId, order, trackingCode } = request.data || {};
  if (typeof storeId !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(trackingCode || '')) throw new HttpsError('invalid-argument', 'Pedido inválido.');
  if (!order || !['in_store', 'delivery'].includes(order.type) || !Array.isArray(order.items) || !order.items.length || order.items.length > 40) throw new HttpsError('invalid-argument', 'Contenido de pedido inválido.');
  const storeRef = db.doc(`stores/${storeId}`);
  const storeSnapshot = await storeRef.get();
  const store = storeSnapshot.data();
  if (!store?.active) throw new HttpsError('failed-precondition', 'La tienda no está disponible.');
  if (!storeIsOpen(store.schedule, store.timeZone)) throw new HttpsError('failed-precondition', 'La tienda está cerrada en este momento.');
  if ((order.type === 'delivery' && !store.capabilities?.deliveryOrdering) || (order.type === 'in_store' && !store.capabilities?.inStoreOrdering)) throw new HttpsError('failed-precondition', 'Esta modalidad no está disponible.');
  const orderRef = storeRef.collection('orders').doc(trackingCode);
  if ((await orderRef.get()).exists) return { trackingCode }; // Safe retry with same client key.
  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.create(orderRef, { ...order, clientRequestId: trackingCode, trackingCode, status: 'pending', createdAt: now, updatedAt: now });
  batch.create(storeRef.collection('orderTracking').doc(trackingCode), { type: order.type, status: 'pending', createdAt: now, updatedAt: now });
  await batch.commit();
  return { trackingCode };
});

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
