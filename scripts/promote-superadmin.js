/**
 * Promueve un usuario a superadmin usando Firebase Admin SDK.
 *
 * Uso:
 * PROMOTE_EMAIL="correo@dominio.com" npm run promote:superadmin
 *
 * Si el usuario no existe en Firebase Auth, también definí PROMOTE_PASSWORD
 * o SUPERADMIN_PASSWORD para crearlo con contraseña.
 */

import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getOptionalEnv, initializeAdminApp } from './firebase-admin.js';
import { ROLES } from '../config/app-constants.js';

async function getOrCreateUser(email, password) {
  try {
    const user = await getAuth().getUserByEmail(email);
    console.log(`Usuario Auth encontrado: ${email}`);
    return user;
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }

    if (!password) {
      throw new Error('El usuario no existe. Definí PROMOTE_PASSWORD o SUPERADMIN_PASSWORD para crearlo.');
    }

    const user = await getAuth().createUser({
      email,
      password,
      emailVerified: true,
      disabled: false,
    });

    console.log(`Usuario Auth creado: ${email}`);
    return user;
  }
}

async function main() {
  initializeAdminApp();

  const email = getOptionalEnv('PROMOTE_EMAIL') || getOptionalEnv('SUPERADMIN_EMAIL');
  const password = getOptionalEnv('PROMOTE_PASSWORD') || getOptionalEnv('SUPERADMIN_PASSWORD');

  if (!email) {
    throw new Error('Falta PROMOTE_EMAIL o SUPERADMIN_EMAIL.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await getOrCreateUser(normalizedEmail, password);

  if (password) {
    await getAuth().updateUser(user.uid, {
      password,
      emailVerified: true,
      disabled: false,
    });
    console.log('Contraseña actualizada.');
  }

  await getFirestore().collection('users').doc(user.uid).set(
    {
      uid: user.uid,
      email: normalizedEmail,
      role: ROLES.SUPERADMIN,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(`Usuario promovido a superadmin: ${normalizedEmail}`);
}

main().catch((error) => {
  console.error('No se pudo promover el usuario:', error);
  process.exit(1);
});
