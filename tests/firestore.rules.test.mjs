import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
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
} from 'firebase/firestore';

let testEnv;
const projectId = 'menu-templates-rules-test';

function adminDb(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

function publicDb() {
  return testEnv.unauthenticatedContext().firestore();
}

function withoutField(data, field) {
  const copy = { ...data };
  delete copy[field];
  return copy;
}

function publicOrder(overrides = {}, trackingCode = 'publictrackingcode1234') {
  return {
    customerName: 'Ana Pérez',
    customerPhone: '+57 300 123 4567',
    type: 'in_store',
    tableNumber: 12,
    clientRequestId: trackingCode,
    trackingCode,
    status: 'pending',
    items: [{ itemId: 'item-1', name: 'Hamburguesa', quantity: 1, price: 18000 }],
    total: 18000,
    notes: 'Sin cebolla',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Ejecuta esta prueba con: npm run test:emulator');
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile('firestore.rules', 'utf8') },
  });

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'stores', 'store-a'), { active: true, slug: 'tienda-a', capabilities: { inStoreOrdering: true, deliveryOrdering: true } }),
      setDoc(doc(db, 'stores', 'store-b'), { active: true, slug: 'tienda-b', capabilities: { inStoreOrdering: true, deliveryOrdering: true } }),
      setDoc(doc(db, 'users', 'admin-a'), { role: 'storeadmin', storeId: 'store-a' }),
      setDoc(doc(db, 'users', 'admin-b'), { role: 'storeadmin', storeId: 'store-b' }),
      setDoc(doc(db, 'users', 'superadmin'), { role: 'superadmin' }),
      setDoc(doc(db, 'stores', 'store-a', 'orders', 'active-a'), {
        status: 'pending',
        createdAt: Timestamp.fromDate(new Date()),
      }),
      setDoc(doc(db, 'stores', 'store-b', 'orders', 'active-b'), {
        status: 'pending',
        createdAt: Timestamp.fromDate(new Date()),
      }),
      setDoc(doc(db, 'stores', 'store-a', 'orderTracking', 'securetrackingcode123'), {
        type: 'delivery', status: 'preparing', createdAt: Timestamp.fromDate(new Date()), updatedAt: Timestamp.fromDate(new Date()),
      }),
    ]);
  });
});

after(async () => {
  await testEnv?.cleanup();
});

test('el rastreo público permite get directo pero bloquea listados', async () => {
  await assertSucceeds(getDoc(doc(publicDb(), 'stores', 'store-a', 'orderTracking', 'securetrackingcode123')));
  await assertFails(getDocs(collection(publicDb(), 'stores', 'store-a', 'orderTracking')));
});

test('un registro público solo puede crear su perfil customer, con nombre opcional', async () => {
  await assertSucceeds(setDoc(doc(adminDb('new-customer'), 'users', 'new-customer'), {
    uid: 'new-customer', email: 'customer@example.com', name: 'Cliente Google', role: 'customer', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }));
  await assertFails(setDoc(doc(adminDb('forged-admin'), 'users', 'forged-admin'), {
    uid: 'forged-admin', email: 'admin@example.com', role: 'superadmin', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }));
});

test('storeadmin puede cargar pedidos activos únicamente de su tienda', async () => {
  const ownOrders = query(
    collection(adminDb('admin-a'), 'stores', 'store-a', 'orders'),
    where('status', '==', 'pending'),
    limit(50),
  );
  const otherStoreOrders = query(
    collection(adminDb('admin-a'), 'stores', 'store-b', 'orders'),
    where('status', '==', 'pending'),
    limit(50),
  );

  await assertSucceeds(getDocs(ownOrders));
  await assertFails(getDocs(otherStoreOrders));
});

test('storeadmin no puede cambiar campos administrativos de su tienda', async () => {
  await assertFails(
    setDoc(doc(adminDb('admin-a'), 'stores', 'store-a'), { active: false }, { merge: true }),
  );
  await assertSucceeds(
    setDoc(doc(adminDb('admin-a'), 'stores', 'store-a'), { name: 'Nuevo nombre' }, { merge: true }),
  );
});

test('storeadmin solo puede actualizar el estado de un pedido', async () => {
  await assertSucceeds(
    setDoc(doc(adminDb('admin-a'), 'stores', 'store-a', 'orders', 'active-a'), { status: 'accepted' }, { merge: true }),
  );
  await assertFails(
    setDoc(doc(adminDb('admin-a'), 'stores', 'store-a', 'orders', 'active-a'), { total: 1 }, { merge: true }),
  );
});

test('un pedido público válido solo se crea en una tienda activa', async () => {
  await assertSucceeds(
    setDoc(doc(publicDb(), 'stores', 'store-a', 'orders', 'publictrackingcode1234'), publicOrder()),
  );
});

test('un domicilio público exige teléfono y dirección, y no permite mesa', async () => {
  await assertSucceeds(
    setDoc(
      doc(publicDb(), 'stores', 'store-a', 'orders', 'deliverytrackingcode123'),
      withoutField(publicOrder({
        type: 'delivery',
        customerPhone: '+57 300 123 4567',
        deliveryAddress: 'Calle 123 #45-67',
      }, 'deliverytrackingcode123'), 'tableNumber'),
    ),
  );

  await assertFails(
    setDoc(
      doc(publicDb(), 'stores', 'store-a', 'orders', 'invalid-delivery-order'),
      withoutField(publicOrder({ type: 'delivery' }), 'tableNumber'),
    ),
  );
});

test('un pedido en mesa exige mesa y no permite datos de domicilio', async () => {
  await assertFails(
    setDoc(
      doc(publicDb(), 'stores', 'store-a', 'orders', 'missing-table-order'),
      withoutField(publicOrder(), 'tableNumber'),
    ),
  );
  await assertFails(
    setDoc(
      doc(publicDb(), 'stores', 'store-a', 'orders', 'table-with-phone-order'),
      publicOrder({ customerPhone: '+57 300 123 4567' }),
    ),
  );
});

test('la creación pública respeta las capacidades de la tienda', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'stores', 'no-delivery-store'), {
      active: true,
      capabilities: { inStoreOrdering: true, deliveryOrdering: false },
    });
  });

  await assertFails(
    setDoc(
      doc(publicDb(), 'stores', 'no-delivery-store', 'orders', 'blocked-delivery-order'),
      withoutField(publicOrder({
        type: 'delivery',
        customerPhone: '+57 300 123 4567',
        deliveryAddress: 'Calle 123 #45-67',
      }), 'tableNumber'),
    ),
  );
});

test('la creación pública rechaza estados que no sean pending', async () => {
  await assertFails(
    setDoc(
      doc(publicDb(), 'stores', 'store-a', 'orders', 'forged-order'),
      publicOrder({ status: 'accepted' }),
    ),
  );
});

test('la creación pública se bloquea para tiendas inactivas', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'stores', 'inactive-store'), { active: false, capabilities: { inStoreOrdering: true } });
  });

  await assertFails(
    setDoc(doc(publicDb(), 'stores', 'inactive-store', 'orders', 'blocked-order'), publicOrder()),
  );
});
