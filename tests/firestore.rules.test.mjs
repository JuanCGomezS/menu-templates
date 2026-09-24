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

function publicOrder(overrides = {}) {
  return {
    customerName: 'Ana Pérez',
    customerPhone: '+57 300 123 4567',
    type: 'in_store',
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
      setDoc(doc(db, 'stores', 'store-a'), { active: true, slug: 'tienda-a' }),
      setDoc(doc(db, 'stores', 'store-b'), { active: true, slug: 'tienda-b' }),
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
    ]);
  });
});

after(async () => {
  await testEnv?.cleanup();
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

test('un pedido público válido solo se crea en una tienda activa', async () => {
  await assertSucceeds(
    setDoc(doc(publicDb(), 'stores', 'store-a', 'orders', 'public-order'), publicOrder()),
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
    await setDoc(doc(context.firestore(), 'stores', 'inactive-store'), { active: false });
  });

  await assertFails(
    setDoc(doc(publicDb(), 'stores', 'inactive-store', 'orders', 'blocked-order'), publicOrder()),
  );
});
