/**
 * Crea o actualiza usuarios demo de Firebase Auth y sus perfiles en Firestore.
 * Usa Firebase Admin SDK para saltar reglas de seguridad durante el bootstrap.
 */

import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getOptionalEnv, getRequiredEnv, initializeAdminApp } from './firebase-admin.js';
import { ROLES } from '../config/app-constants.js';

const STORE_ID = 'store_cafe_bella_vista';
const STORE_SLUG = 'cafe-bella-vista';

async function upsertAuthUser({ email, password, label }) {
  let user;

  try {
    user = await getAuth().getUserByEmail(email);
    console.log(`Usuario Auth existente: ${label} (${email})`);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }

    if (!password) {
      throw new Error(`Falta la contraseña para crear el usuario ${label}. Definí ${label.toUpperCase()}_PASSWORD.`);
    }

    const createPayload = {
      email,
      emailVerified: true,
      disabled: false,
      password,
    };

    user = await getAuth().createUser(createPayload);
    console.log(`Usuario Auth creado: ${label} (${email})`);
  }

  if (password) {
    await getAuth().updateUser(user.uid, { password, emailVerified: true, disabled: false });
    console.log(`Contraseña actualizada: ${label}`);
  } else {
    console.log(`Sin contraseña nueva para ${label}; se conserva la existente.`);
  }

  return user;
}

async function upsertUserProfile({ email, password, label, profile }) {
  const user = await upsertAuthUser({ email, password, label });
  const db = getFirestore();
  const userRef = db.collection('users').doc(user.uid);
  const existingProfile = await userRef.get();

  await userRef.set(
    {
      uid: user.uid,
      email,
      ...profile,
      ...(existingProfile.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(`Perfil Firestore actualizado: users/${user.uid} (${profile.role})`);
  return user;
}

async function main() {
  initializeAdminApp();

  const superadminEmail = getRequiredEnv('SUPERADMIN_EMAIL');
  const storeadminEmail = getRequiredEnv('STOREADMIN_EMAIL');
  const customerEmail = getOptionalEnv('CUSTOMER_EMAIL');

  await upsertUserProfile({
    label: ROLES.SUPERADMIN,
    email: superadminEmail,
    password: getOptionalEnv('SUPERADMIN_PASSWORD'),
    profile: { role: ROLES.SUPERADMIN },
  });

  const storeadmin = await upsertUserProfile({
    label: ROLES.STOREADMIN,
    email: storeadminEmail,
    password: getOptionalEnv('STOREADMIN_PASSWORD'),
    profile: {
      role: ROLES.STOREADMIN,
      storeId: STORE_ID,
      storeSlug: STORE_SLUG,
    },
  });

  await getFirestore().collection('stores').doc(STORE_ID).set(
    {
      ownerUid: storeadmin.uid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`Tienda vinculada al storeadmin: stores/${STORE_ID}`);

  if (customerEmail) {
    await upsertUserProfile({
      label: ROLES.CUSTOMER,
      email: customerEmail,
      password: getOptionalEnv('CUSTOMER_PASSWORD'),
      profile: { role: ROLES.CUSTOMER },
    });
  } else {
    console.log('CUSTOMER_EMAIL no definido; se omite el perfil customer opcional.');
  }

  console.log('\nBootstrap de usuarios finalizado.');
}

main().catch((error) => {
  console.error('No se pudo ejecutar el bootstrap de usuarios:', error);
  process.exit(1);
});
