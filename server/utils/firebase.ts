import { userAvatarBucket, productImgBucket } from "../configs/firebaseAdmin.config";

// Function won't throw error
export async function deleteFileFromFirebaseStorage(
  downloadUrl: string,
  bucketName: "user-avatar" | "product-image"
): Promise<void> {
  if (
    !downloadUrl ||
    !downloadUrl.startsWith("https://firebasestorage.googleapis.com/")
  ) {
    console.warn(
      "Invalid or non-Firebase URL provided for deletion, skipping:",
      downloadUrl
    );
    return;
  }

  let filePath = "";
  try {
    // Extract the file path from the download URL
    // Example URL: https://firebasestorage.googleapis.com/v0/b/YOUR_BUCKET_NAME/o/path%2Fto%2Ffile.jpg?alt=media&token=TOKEN
    const urlParts = downloadUrl.split("/o/");
    if (urlParts.length < 2) {
      console.warn(
        "Cannot extract file path from Firebase Storage URL:",
        downloadUrl
      );
      return;
    }

    const filePathEncoded = urlParts[1].split("?")[0];
    filePath = decodeURIComponent(filePathEncoded);
    if (!filePath) {
      console.warn(
        "Empty file path extracted from URL, skipping deletion:",
        downloadUrl
      );
      return;
    }

    const storageBucket = bucketName === "user-avatar" ? userAvatarBucket : productImgBucket;
    const file = storageBucket.file(filePath);
    await file.delete();
    console.log(
      `File ${filePath} deleted from Firebase Storage successfully.`
    );
  } catch (error) {
    const pathForLog = filePath || downloadUrl;
    // Check for object not found error (code 404 for GCS)
    if (
      error.code === 404 ||
      (error.errors &&
        error.errors.some((e: { reason: string }) => e.reason === "notFound"))
    ) {
      console.warn(
        `File not found in Firebase Storage (it may have been already deleted): ${pathForLog}`
      );
    } else {
      console.error(
        `Error deleting file ${pathForLog} from Firebase Storage:`,
        error.message || error
      );
    }
  }
}

// Function won't throw error
export async function deleteManyFileFromFirebaseStorage(
  downloadUrls: string[],
  bucketName: "user-avatar" | "product-image"
): Promise<void> {
  for (const downloadUrl of downloadUrls) {
    await deleteFileFromFirebaseStorage(downloadUrl, bucketName);
  }
}
