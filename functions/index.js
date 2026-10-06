const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const { storeIsOpen } = require("./store-hours");
const { isValidPoint, isWithinDeliveryArea } = require("./delivery-area");
const { isStoreSubscriptionActive } = require("./subscription");
const STORE_ADMIN_URL =
  "https://JuanCGomezS.github.io/menu-templates/admin/store/";

exports.createPublicOrder = onCall(async (request) => {
  const { storeId, order, trackingCode } = request.data || {};
  if (
    typeof storeId !== "string" ||
    !/^[a-zA-Z0-9_-]{16,100}$/.test(trackingCode || "")
  )
    throw new HttpsError("invalid-argument", "Pedido inválido.");
  if (
    !order ||
    !["in_store", "delivery"].includes(order.type) ||
    !Array.isArray(order.items) ||
    !order.items.length ||
    order.items.length > 40
  )
    throw new HttpsError("invalid-argument", "Contenido de pedido inválido.");
  const storeRef = db.doc(`stores/${storeId}`);
  const storeSnapshot = await storeRef.get();
  const store = storeSnapshot.data();
  if (!store?.active || !isStoreSubscriptionActive(store.subscription))
    throw new HttpsError(
      "failed-precondition",
      "La tienda no está disponible.",
    );
  if (!storeIsOpen(store.schedule, store.timeZone))
    throw new HttpsError(
      "failed-precondition",
      "La tienda está cerrada en este momento.",
    );
  if (
    (order.type === "delivery" && !store.capabilities?.deliveryOrdering) ||
    (order.type === "in_store" && !store.capabilities?.inStoreOrdering)
  )
    throw new HttpsError(
      "failed-precondition",
      "Esta modalidad no está disponible.",
    );
  if (
    order.type === "delivery" &&
    (typeof order.customerPhone !== "string" ||
      !/^\d{10}$/.test(order.customerPhone))
  )
    throw new HttpsError(
      "invalid-argument",
      "El teléfono debe tener 10 dígitos.",
    );
  if (order.type === "delivery" && !isValidPoint(order.deliveryLocation))
    throw new HttpsError("invalid-argument", "Ubicación de entrega inválida.");
  if (
    order.type === "delivery" &&
    !isWithinDeliveryArea(
      store.deliveryArea,
      store.location,
      order.deliveryLocation,
    )
  )
    throw new HttpsError(
      "failed-precondition",
      "La ubicación de entrega está fuera del área de cobertura.",
    );
  const orderRef = storeRef.collection("orders").doc(trackingCode);
  if ((await orderRef.get()).exists) return { trackingCode }; // Safe retry with same client key.
  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.create(orderRef, {
    ...order,
    clientRequestId: trackingCode,
    trackingCode,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
  batch.create(storeRef.collection("orderTracking").doc(trackingCode), {
    type: order.type,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
  await batch.commit();
  return { trackingCode };
});

exports.notifyStoreAdminOfNewOrder = onDocumentCreated(
  "stores/{storeId}/orders/{orderId}",
  async (event) => {
    const order = event.data?.data();
    if (!order || order.status !== "pending") return;

    const storeSnapshot = await db.doc(`stores/${event.params.storeId}`).get();
    const ownerUid = storeSnapshot.data()?.ownerUid;
    if (!ownerUid) {
      logger.info("Order without assigned store admin; push skipped.", {
        storeId: event.params.storeId,
      });
      return;
    }

    const deviceRef = db.doc(
      `stores/${event.params.storeId}/notificationDevices/${ownerUid}`,
    );
    const deviceSnapshot = await deviceRef.get();
    const token = deviceSnapshot.data()?.token;
    if (!token) return;

    try {
      await admin.messaging().send({
        token,
        notification: {
          title: "Nuevo pedido",
          body: "Revisa la cola operativa.",
        },
        data: {
          storeId: event.params.storeId,
          orderId: event.params.orderId,
          type: String(order.type || ""),
        },
        webpush: {
          fcmOptions: { link: STORE_ADMIN_URL },
        },
      });
    } catch (error) {
      // Invalid tokens should not trigger retries or repeated reads on later orders.
      if (
        error?.code === "messaging/registration-token-not-registered" ||
        error?.code === "messaging/invalid-registration-token"
      ) {
        await deviceRef.delete();
        return;
      }
      logger.error("FCM notification failed.", error);
    }
  },
);
