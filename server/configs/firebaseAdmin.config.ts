import admin from "firebase-admin";
// import serviceAccount from "../serviceAccountKey.json";
import dotenv from "dotenv";

dotenv.config();
const {
  FIREBASE_USER_AVATAR_BUCKET,
  FIREBASE_PRODUCT_IMAGE_BUCKET,
  FIREBASE_RETURN_IMAGE_BUCKET,
  FIREBASE_PRODUCT_LOGO_BUCKET,
} = process.env as { [key: string]: string };

// The SDK will automatically find the credentials via the
// GOOGLE_APPLICATION_CREDENTIALS environment variable set from package.json
// The storageBucket property is not needed here since we are getting references to our specific buckets by name.
admin.initializeApp({
  // credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  // storageBucket: FIREBASE_DEFAULT_BUCKET,
});

// Get a reference to the default bucket
// export const bucket = admin.storage().bucket();

// Get references to other buckets by name
export const userAvatarBucket = admin.storage().bucket(FIREBASE_USER_AVATAR_BUCKET);
export const productImgBucket = admin.storage().bucket(FIREBASE_PRODUCT_IMAGE_BUCKET);
export const returnImgBucket = admin.storage().bucket(FIREBASE_RETURN_IMAGE_BUCKET);
export const productLogoBucket = admin.storage().bucket(FIREBASE_PRODUCT_LOGO_BUCKET);