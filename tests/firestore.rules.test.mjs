import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";

let testEnv;
const projectId = "menu-templates-rules-test";

function adminDb(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

function publicDb() {
  return testEnv.unauthenticatedContext().firestore();
}

function publicOrder(overrides = {}, trackingCode = "publictrackingcode1234") {
  return {
    customerName: "Ana Pérez",
    type: "in_store",
    tableNumber: 12,
    clientRequestId: trackingCode,
    trackingCode,
    status: "pending",
    items: [
      { itemId: "item-1", name: "Hamburguesa", quantity: 1, price: 18000 },
    ],
    total: 18000,
    notes: "Sin cebolla",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function publicOrderBatch(storeId, trackingCode, overrides = {}) {
  const db = publicDb();
  const batch = writeBatch(db);
  const order = publicOrder(overrides, trackingCode);
  if (order.tableNumber === undefined) delete order.tableNumber;
  batch.set(doc(db, "stores", storeId, "orders", trackingCode), order);
  batch.set(doc(db, "stores", storeId, "orderTracking", trackingCode), {
    type: order.type,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return batch.commit();
}

before(async () => {
  assert.ok(
    process.env.FIRESTORE_EMULATOR_HOST,
    "Ejecuta esta prueba con: npm run test:emulator",
  );
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile("firestore.rules", "utf8") },
  });

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "stores", "store-a"), {
        active: true,
        slug: "tienda-a",
        capabilities: { inStoreOrdering: true, deliveryOrdering: true },
      }),
      setDoc(doc(db, "stores", "store-b"), {
        active: true,
        slug: "tienda-b",
        capabilities: { inStoreOrdering: true, deliveryOrdering: true },
      }),
      setDoc(doc(db, "users", "admin-a"), {
        role: "storeadmin",
        storeId: "store-a",
      }),
      setDoc(doc(db, "users", "admin-b"), {
        role: "storeadmin",
        storeId: "store-b",
      }),
      setDoc(doc(db, "users", "superadmin"), { role: "superadmin" }),
      setDoc(doc(db, "stores", "store-a", "orders", "active-a"), {
        status: "pending",
        createdAt: Timestamp.fromDate(new Date()),
      }),
      setDoc(doc(db, "stores", "store-b", "orders", "active-b"), {
        status: "pending",
        createdAt: Timestamp.fromDate(new Date()),
      }),
      setDoc(
        doc(db, "stores", "store-a", "orderTracking", "securetrackingcode123"),
        {
          type: "delivery",
          status: "preparing",
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date()),
        },
      ),
    ]);
  });
});

after(async () => {
  await testEnv?.cleanup();
});

test("el rastreo público permite get directo pero bloquea listados", async () => {
  await assertSucceeds(
    getDoc(
      doc(
        publicDb(),
        "stores",
        "store-a",
        "orderTracking",
        "securetrackingcode123",
      ),
    ),
  );
  await assertFails(
    getDocs(collection(publicDb(), "stores", "store-a", "orderTracking")),
  );
  await assertFails(
    getDoc(doc(publicDb(), "stores", "store-a", "orders", "active-a")),
  );
});

test("un registro público solo puede crear su perfil customer, con nombre opcional", async () => {
  await assertSucceeds(
    setDoc(doc(adminDb("new-customer"), "users", "new-customer"), {
      uid: "new-customer",
      email: "customer@example.com",
      name: "Cliente Google",
      role: "customer",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    setDoc(doc(adminDb("forged-admin"), "users", "forged-admin"), {
      uid: "forged-admin",
      email: "admin@example.com",
      role: "superadmin",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});

test("storeadmin puede cargar pedidos activos únicamente de su tienda", async () => {
  const ownOrders = query(
    collection(adminDb("admin-a"), "stores", "store-a", "orders"),
    where("status", "==", "pending"),
    limit(50),
  );
  const otherStoreOrders = query(
    collection(adminDb("admin-a"), "stores", "store-b", "orders"),
    where("status", "==", "pending"),
    limit(50),
  );

  await assertSucceeds(getDocs(ownOrders));
  await assertFails(getDocs(otherStoreOrders));
});

test("storeadmin no puede cambiar campos administrativos de su tienda", async () => {
  await assertFails(
    setDoc(
      doc(adminDb("admin-a"), "stores", "store-a"),
      { active: false },
      { merge: true },
    ),
  );
  await assertSucceeds(
    setDoc(
      doc(adminDb("admin-a"), "stores", "store-a"),
      { name: "Nuevo nombre" },
      { merge: true },
    ),
  );
});

test("storeadmin solo puede actualizar el estado de un pedido", async () => {
  await assertSucceeds(
    setDoc(
      doc(adminDb("admin-a"), "stores", "store-a", "orders", "active-a"),
      { status: "accepted" },
      { merge: true },
    ),
  );
  await assertFails(
    setDoc(
      doc(adminDb("admin-a"), "stores", "store-a", "orders", "active-a"),
      { total: 1 },
      { merge: true },
    ),
  );
});

test("un pedido público válido crea un pedido y un rastreo juntos", async () => {
  await assertSucceeds(publicOrderBatch("store-a", "publictrackingcode1234"));
  const tracking = await assertSucceeds(
    getDoc(
      doc(
        publicDb(),
        "stores",
        "store-a",
        "orderTracking",
        "publictrackingcode1234",
      ),
    ),
  );
  assert.deepEqual(Object.keys(tracking.data()).sort(), [
    "createdAt",
    "status",
    "type",
    "updatedAt",
  ]);
});

test("un pedido y su rastreo no se pueden crear por separado", async () => {
  const code = "separateordercode1234";
  await assertFails(
    setDoc(
      doc(publicDb(), "stores", "store-a", "orders", code),
      publicOrder({}, code),
    ),
  );
  await assertFails(
    setDoc(doc(publicDb(), "stores", "store-a", "orderTracking", code), {
      type: "in_store",
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});

test("out_for_delivery solo se permite para domicilios", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "stores", "store-a", "orders", "ready-table"), {
        type: "in_store",
        status: "ready",
        updatedAt: Timestamp.now(),
      }),
      setDoc(doc(db, "stores", "store-a", "orders", "ready-delivery"), {
        type: "delivery",
        status: "ready",
        updatedAt: Timestamp.now(),
      }),
    ]);
  });
  await assertFails(
    setDoc(
      doc(adminDb("admin-a"), "stores", "store-a", "orders", "ready-table"),
      { status: "out_for_delivery", updatedAt: serverTimestamp() },
      { merge: true },
    ),
  );
  await assertSucceeds(
    setDoc(
      doc(adminDb("admin-a"), "stores", "store-a", "orders", "ready-delivery"),
      { status: "out_for_delivery", updatedAt: serverTimestamp() },
      { merge: true },
    ),
  );
});

test("un domicilio público exige teléfono, dirección y punto de mapa, y no permite mesa", async () => {
  await assertSucceeds(
    publicOrderBatch("store-a", "deliverytrackingcode123", {
      type: "delivery",
      customerPhone: "+57 300 123 4567",
      deliveryAddress: "Calle 123 #45-67",
      deliveryLocation: { latitude: 4.711, longitude: -74.0721 },
      tableNumber: undefined,
    }),
  );

  await assertFails(
    publicOrderBatch("store-a", "invaliddeliverycode123", {
      type: "delivery",
      customerPhone: "+57 300 123 4567",
      deliveryAddress: "Calle 123 #45-67",
      tableNumber: undefined,
    }),
  );
  await assertFails(
    publicOrderBatch("store-a", "invalidcoordinates123", {
      type: "delivery",
      customerPhone: "+57 300 123 4567",
      deliveryAddress: "Calle 123 #45-67",
      deliveryLocation: { latitude: 91, longitude: -74.0721 },
      tableNumber: undefined,
    }),
  );
});

test("un pedido en mesa exige mesa y no permite datos de domicilio", async () => {
  await assertFails(
    publicOrderBatch("store-a", "missingtablecode1234", {
      tableNumber: undefined,
    }),
  );
  await assertFails(
    publicOrderBatch("store-a", "tablewithphonecode123", {
      customerPhone: "+57 300 123 4567",
    }),
  );
  await assertFails(
    publicOrderBatch("store-a", "tablewithlocation123", {
      deliveryLocation: { latitude: 4.711, longitude: -74.0721 },
    }),
  );
});

test("la creación pública respeta las capacidades de la tienda", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "stores", "no-delivery-store"), {
      active: true,
      capabilities: { inStoreOrdering: true, deliveryOrdering: false },
    });
  });

  await assertFails(
    publicOrderBatch("no-delivery-store", "blockeddeliverycode123", {
      type: "delivery",
      customerPhone: "+57 300 123 4567",
      deliveryAddress: "Calle 123 #45-67",
      deliveryLocation: { latitude: 4.711, longitude: -74.0721 },
      tableNumber: undefined,
    }),
  );
});

test("la creación pública rechaza estados que no sean pending", async () => {
  await assertFails(
    publicOrderBatch("store-a", "forgedstatuscode1234", {
      status: "accepted",
    }),
  );
});

test("la creación pública se bloquea para tiendas inactivas", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "stores", "inactive-store"), {
      active: false,
      capabilities: { inStoreOrdering: true },
    });
  });

  await assertFails(publicOrderBatch("inactive-store", "inactiveordercode123"));
});
