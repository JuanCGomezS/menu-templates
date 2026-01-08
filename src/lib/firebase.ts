import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDcEDy1vTJL5IkN-ELKltGabGz7pN7NZbk",
  authDomain: "menu-templates.firebaseapp.com",
  projectId: "menu-templates",
  storageBucket: "menu-templates.firebasestorage.app",
  messagingSenderId: "739218044592",
  appId: "1:739218044592:web:00509b2188c7509e71ed75",
  measurementId: "G-9R9Z2R06XL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

