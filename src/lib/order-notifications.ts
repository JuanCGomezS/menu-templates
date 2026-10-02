import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { app, db, vapidKey } from './firebase';
import { withBasePath } from './base-path';

export async function registerOrderPush(storeId: string, user: User) {
  if (!vapidKey) throw new Error('Las notificaciones push no están configuradas para esta publicación.');
  if (!('serviceWorker' in navigator) || !('Notification' in window)) throw new Error('Este navegador no admite notificaciones push.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('El navegador bloqueó las notificaciones.');

  const config = btoa(JSON.stringify(app.options));
  const registration = await navigator.serviceWorker.register(`${withBasePath('/firebase-messaging-sw.js')}?config=${encodeURIComponent(config)}`);
  const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
  if (!await isSupported()) throw new Error('Este navegador no admite Firebase Cloud Messaging.');
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error('No fue posible obtener el token de notificación.');
  await setDoc(doc(db, 'stores', storeId, 'notificationDevices', user.uid), { token, updatedAt: serverTimestamp() });
}
