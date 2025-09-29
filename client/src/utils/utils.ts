import type { Response } from "../../../common/types.common";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  productImgStorage,
  returnImgStorage,
  userAvatarStorage,
} from "./firebase.config";
import {
  PRODUCT_IMAGE_ALLOWED_TYPES,
  ORDER_RETURN_IMG_ALLOWED_TYPES,
  ORDER_RETURN_IMG_MAX_SIZE,
  PRODUCT_IMAGE_MAX_SIZE,
  PRODUCT_IMAGE_MAX_WIDTH,
  PRODUCT_IMAGE_MAX_HEIGHT,
  AVATAR_ALLOWED_TYPES,
  AVATAR_MAX_SIZE,
  AVATAR_MAX_WIDTH,
  AVATAR_MAX_HEIGHT,
} from "../../../common/configs.common";
import { readFileAsDataUrl } from "../../../common/utils.common";

async function request(
  url: string,
  method: string = "GET",
  data: object | null = null,
  headers: Record<string, string> = {},
  signal?: AbortSignal
): Promise<Response> {
  try {
    let body: BodyInit | null = null;

    if (data) {
      if (data instanceof FormData) {
        body = data;
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(data);
      }
    }

    const res = await fetch(url, {
      method,
      headers,
      body,
      signal,
    });

    return (await res.json()) as Response;
  } catch (error) {
    console.error(`Fetch error (${method} ${url}):`, error);
    throw error;
  }
}

export async function retrieve(
  url: string,
  signal?: AbortSignal
): Promise<Response> {
  return await request(url, "GET", null, {}, signal);
}

export async function post(
  url: string,
  data: object | null = null
): Promise<Response> {
  return await request(url, "POST", data);
}

export async function remove(
  url: string,
  id?: string | number
): Promise<Response> {
  return await request(id ? `${url}/${id}` : url, "DELETE");
}

export async function patch(
  url: string,
  id: string | number | undefined,
  data: object
): Promise<Response> {
  let method = "PATCH";
  const headers: Record<string, string> = {};

  if (data instanceof FormData) {
    method = "POST"; // FormData only work with POST
    headers["X-HTTP-Method-Override"] = "PATCH"; // Override to PATCH
  }

  return await request(id ? `${url}/${id}` : url, method, data, headers);
}

// Return download URL if upload success, undefined otherwise
export const uploadFile = async (
  file: File,
  storageType: "avatar" | "product" | "order-return"
): Promise<string | undefined> => {
  try {
    const storage =
      storageType === "avatar"
        ? userAvatarStorage
        : storageType === "product"
        ? productImgStorage
        : returnImgStorage;

    const fileName = new Date().getTime() + "_" + file.name; // Ensure unique name
    const storageRef = ref(storage, fileName);
    const uploadTaskSnapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(uploadTaskSnapshot.ref);

    return downloadUrl;
  } catch (error) {
    console.error("Error uploading file to Firebase:", error);
  }
};

export async function getImgFileErrs(
  file: File,
  category: "order return" | "product" | "avatar"
): Promise<string[]> {
  const errors = [];

  const [IMG_ALLOWED_TYPES, IMG_MAX_SIZE, IMG_MAX_WIDTH, IMG_MAX_HEIGHT] =
    category === "order return"
      ? [ORDER_RETURN_IMG_ALLOWED_TYPES, ORDER_RETURN_IMG_MAX_SIZE]
      : category === "product"
      ? [
          PRODUCT_IMAGE_ALLOWED_TYPES,
          PRODUCT_IMAGE_MAX_SIZE,
          PRODUCT_IMAGE_MAX_WIDTH,
          PRODUCT_IMAGE_MAX_HEIGHT,
        ]
      : [
          AVATAR_ALLOWED_TYPES,
          AVATAR_MAX_SIZE,
          AVATAR_MAX_WIDTH,
          AVATAR_MAX_HEIGHT,
        ];

  if (!(IMG_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    errors.push(
      `Invalid file type. Allowed types are: ${IMG_ALLOWED_TYPES.join(", ")}`
    );
  }

  if (file.size > IMG_MAX_SIZE) {
    errors.push(
      `File size exceeds the maximum of ${IMG_MAX_SIZE / (1024 * 1024)}MB`
    );
  }

  try {
    const img = new Image();
    img.src = (await readFileAsDataUrl(file)) as string;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    if (
      (IMG_MAX_WIDTH !== undefined && img.width > IMG_MAX_WIDTH) ||
      (IMG_MAX_HEIGHT !== undefined && img.height > IMG_MAX_HEIGHT)
    ) {
      errors.push(
        `Image dimensions exceed the maximum allowed size of ${IMG_MAX_WIDTH}x${IMG_MAX_HEIGHT}px`
      );
    }
  } catch {
    errors.push(`Uploaded file is not a valid image`);
  }

  return errors;
}

export async function getImgFilesErrs(
  files: File[] | FileList,
  category: "order return" | "product" | "avatar"
): Promise<string[]> {
  const allErrors: string[] = [];

  for (const file of files) {
    const errors = await getImgFileErrs(file, category);
    if (errors.length) {
      allErrors.push(`File "${file.name}": ${errors.join("; ")}`);
    }
  }

  return allErrors;
}

export function createFileList(files: File[] | FileList): FileList {
  if (files instanceof FileList) return files;

  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));

  return dataTransfer.files;
}
