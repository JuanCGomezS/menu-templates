import { initializeApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

function requiredEnv(name: string) {
  const value = import.meta.env[name]?.trim();

  if (!value) {
    //Falta configurar ${name}. Crea un archivo .env local o agrega el secret correspondiente en GitHub Actions.
    throw new Error(
      `Error: Consulte la documentación para configurar la variable de entorno ${name}.`
    );
  }

  return value;
}

const firebaseConfig = {
  apiKey: requiredEnv("PUBLIC_FIREBASE_API_KEY"),
  authDomain: requiredEnv("PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: requiredEnv("PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: requiredEnv("PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requiredEnv("PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: requiredEnv("PUBLIC_FIREBASE_APP_ID"),
  measurementId: import.meta.env.PUBLIC_FIREBASE_MEASUREMENT_ID?.trim(),
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("No se pudo configurar la persistencia local de sesión:", error);
});
