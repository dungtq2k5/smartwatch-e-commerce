import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Request additional user data like gender and birthday
googleProvider.addScope("https://www.googleapis.com/auth/user.birthday.read");
googleProvider.addScope("https://www.googleapis.com/auth/user.gender.read");

// Initialize Cloud Storage and get a reference to the default service
// export const storage = getStorage(app);

// Get references to other buckets by name
export const userAvatarStorage = getStorage(
  app,
  `gs://${import.meta.env.VITE_FIREBASE_USER_AVATAR_BUCKET}`
);
export const productImgStorage = getStorage(
  app,
  `gs://${import.meta.env.VITE_FIREBASE_PRODUCT_IMAGE_BUCKET}`
);
export const returnImgStorage = getStorage(
  app,
  `gs://${import.meta.env.VITE_FIREBASE_RETURN_IMAGE_BUCKET}`
);