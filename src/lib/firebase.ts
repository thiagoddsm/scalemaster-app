import { initializeApp, getApps, getApp, App } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
export const firebaseConfig = {
  projectId: "scalemaster-xemva",
  appId: "1:523193415361:web:ea9e980d4638bdf4ec4640",
  storageBucket: "scalemaster-xemva.appspot.com",
  apiKey: "AIzaSyBGgQQxmhEtQzWqfKHVX_eY91EpZa_eNR8",
  authDomain: "scalemaster-xemva.firebaseapp.com",
  messagingSenderId: "523193415361",
};

// Initialize Firebase
let app: App;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);

export { app, db };
