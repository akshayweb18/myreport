import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBTeoSmgZLD16ad4SLXyRVuRztWcH0Rxug",
  authDomain: "myreport-dab73.firebaseapp.com",
  projectId: "myreport-dab73",
  storageBucket: "myreport-dab73.firebasestorage.app",
  messagingSenderId: "1063233309823",
  appId: "1:1063233309823:web:407fa439c6b39d368fc34a",
  measurementId: "G-40G5CNE19Z",
};

// Prevent duplicate initialization during hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
