import { initializeApp, getApps, getApp, App } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "scalemaster-xemva",
  appId: "1:523193415361:web:ea9e980d4638bdf4ec4640",
  storageBucket: "scalemaster-xemva.appspot.com",
  apiKey: "YOUR_API_KEY",
  authDomain: "scalemaster-xemva.firebaseapp.com",
  messagingSenderId: "523193415361",
};

// Client-side Firebase app
let app: App;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
