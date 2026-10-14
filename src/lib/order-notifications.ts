import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { app, db, vapidKey } from "./firebase";
import { withBasePath } from "./base-path";

export async function hasOrderPush(storeId: string, user: User) {
  if (!vapidKey || !("serviceWorker" in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration(
    withBasePath("/"),
  );
  const serviceWorkerUrl = new URL(
    withBasePath("/firebase-messaging-sw.js"),
    window.location.origin,
  ).href;
  if (registration?.active?.scriptURL !== serviceWorkerUrl) return false;
  const { getMessaging, getToken, isSupported } = await import(
    "firebase/messaging"
  );
  if (!(await isSupported())) return false;
  const token = await getToken(getMessaging(app), {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token) return false;
  const device = await getDoc(
    doc(db, "stores", storeId, "notificationDevices", user.uid),
  );
  return device.data()?.token === token;
}

export async function registerOrderPush(storeId: string, user: User) {
  if (!vapidKey)
    throw new Error(
      "Las notificaciones push no están configuradas para esta publicación.",
    );
  if (!("serviceWorker" in navigator) || !("Notification" in window))
    throw new Error("Este navegador no admite notificaciones push.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    throw new Error("El navegador bloqueó las notificaciones.");

  const config = btoa(JSON.stringify(app.options));
  const registration = await navigator.serviceWorker.register(
    `${withBasePath("/firebase-messaging-sw.js")}?config=${encodeURIComponent(config)}`,
  );
  const { getMessaging, getToken, isSupported } = await import(
    "firebase/messaging"
  );
  if (!(await isSupported()))
    throw new Error("Este navegador no admite Firebase Cloud Messaging.");
  const token = await getToken(getMessaging(app), {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token)
    throw new Error("No fue posible obtener el token de notificación.");
  await setDoc(doc(db, "stores", storeId, "notificationDevices", user.uid), {
    token,
    updatedAt: serverTimestamp(),
  });
}
