import type { Response } from "../../../common/types.common";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { productImgStorage, userAvatarStorage } from "./firebase.config";

async function request(
  url: string,
  method: string = "GET",
  data: object | null = null,
  headers: Record<string, string> = {}
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
    });

    return (await res.json()) as Response;
  } catch (error) {
    console.error(`Fetch error (${method} ${url}):`, error);
    throw error;
  }
}

export async function retrieve(url: string): Promise<Response> {
  return await request(url, "GET");
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

export function formatError(
  err: unknown,
  exceptionMsg: string = "An unknown error occurred"
): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;

  return String(err) || exceptionMsg;
}

// Return download URL if upload success, undefined otherwise
export const uploadFile = async (
  file: File,
  storageType: "avatar" | "product"
): Promise<string | undefined> => {
  try {
    const storage = storageType === "avatar"
      ? userAvatarStorage
      : productImgStorage;
    const fileName = new Date().getTime() + "_" + file.name; // Ensure unique name
    const storageRef = ref(storage, fileName);
    const uploadTaskSnapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(uploadTaskSnapshot.ref);

    return downloadUrl;
  } catch (error) {
    console.error("Error uploading file to Firebase:", error);
  }
};
