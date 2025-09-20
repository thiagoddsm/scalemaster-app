import { initializeApp, getApps, getApp, App } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: "scalemaster-xemva",
  appId: "1:523193415361:web:ea9e980d4638bdf4ec4640",
  storageBucket: "scalemaster-xemva.appspot.com",
  apiKey: "AIzaSyBGgQQxmhEtQzWqfKHVX_eY91EpZa_eNR8",
  authDomain: "scalemaster-xemva.firebaseapp.com",
  messagingSenderId: "523193415361",
};

// Initialize Firebase
// This structure is slightly different to force a reload of the config.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
