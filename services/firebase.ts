
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAZsloVbSv8w_os6mNzuyJQoYNXCxY3RTk",
  authDomain: "rpms-7b6c8.firebaseapp.com",
  projectId: "rpms-7b6c8",
  storageBucket: "rpms-7b6c8.firebasestorage.app",
  messagingSenderId: "52123953414",
  appId: "1:52123953414:web:aa7f021365b56790355687",
  measurementId: "G-RWB4KYFP9V"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
