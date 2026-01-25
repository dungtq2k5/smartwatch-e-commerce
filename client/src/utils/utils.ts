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
  GRN_FILE_IMPORT_EXTENSIONS,
  GRN_FILE_IMPORT_MAX_SIZE,
  GRN_FILE_IMPORT_HEADERS,
} from "../../../common/configs.common";
import {
  formatError,
  readFileAsDataUrl,
  removeOddSpaces,
} from "../../../common/utils.common";
import { REFRESH_TOKEN_URL } from "../configs";
import ExcelJS from "exceljs";

let isRefreshingToken = false; // Prevent "thundering herd" problem where multiple failed requests would all try to refresh the token simultaneously
let failedReqQueue: {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}[] = [];

const processFailedReqQueue = (error: Error | null) => {
  for (const prom of failedReqQueue) {
    if (error) prom.reject(error);
    else prom.resolve(undefined);
  }
  failedReqQueue = [];
};

async function request(
  url: string,
  method: string = "GET",
  data: object | null = null,
  headers: Record<string, string> = {},
  signal: AbortSignal | null = null,
): Promise<Response> {
  const makeRequest = async (): Promise<globalThis.Response> => {
    let body: BodyInit | null = null;

    if (data) {
      if (data instanceof FormData) {
        body = data;
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(data);
      }
    }

    return await fetch(url, {
      method,
      headers,
      body,
      signal,
    });
  };

  try {
    let res = await makeRequest();

    // Handle refresh-token rotation
    if (res.status === 401 && url !== REFRESH_TOKEN_URL) {
      if (isRefreshingToken) {
        // Push to queue and wait for the refresh-token request to finish
        return new Promise((resolve, reject) => {
          failedReqQueue.push({ resolve, reject });
        })
          .then(() => makeRequest())
          .then((retryRes) => retryRes.json());
      }

      isRefreshingToken = true;

      try {
        const refreshRes = await fetch(REFRESH_TOKEN_URL, { method: "POST" });
        if (!refreshRes.ok) {
          const error = new Error("Session expired. Please log in again.");
          processFailedReqQueue(error);

          // Force logout both user and admin
          const useAuthStore = await import("../store/user/authStore");
          const useAdminAuthStore = await import("../store/admin/authStore");
          useAuthStore.default.getState().logout();
          useAdminAuthStore.default.getState().logout();
          throw error;
        }

        processFailedReqQueue(null);
        res = await makeRequest(); // Retry original request
      } catch (error) {
        throw new Error(formatError(error));
      } finally {
        isRefreshingToken = false;
      }
    }

    return (await res.json()) as Response;
  } catch (error) {
    console.error(`Fetch error (${method} ${url}):`, error);
    throw error;
  }
}

export async function retrieve(
  url: string,
  signal: AbortSignal | null = null,
): Promise<Response> {
  return await request(url, "GET", null, {}, signal);
}

export async function post(
  url: string,
  data: object | null = null,
): Promise<Response> {
  return await request(url, "POST", data);
}

export async function remove(
  url: string,
  id: string | number | null = null,
  data: object | null = null,
): Promise<Response> {
  return await request(id ? `${url}/${id}` : url, "DELETE", data);
}

export async function patch(
  url: string,
  id: string | number | null = null,
  data: object | null = null,
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
  storageType: FirebaseBucket,
): Promise<string | undefined> => {
  try {
    const storage =
      storageType === "user-avatar"
        ? userAvatarStorage
        : storageType === "product-image"
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
  category: FirebaseBucket,
): Promise<string[]> {
  const errors = [];

  const [IMG_ALLOWED_TYPES, IMG_MAX_SIZE, IMG_MAX_WIDTH, IMG_MAX_HEIGHT] =
    category === "order-return"
      ? [ORDER_RETURN_IMG_ALLOWED_TYPES, ORDER_RETURN_IMG_MAX_SIZE]
      : category === "product-image"
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
      `Invalid file type. Allowed types are: ${IMG_ALLOWED_TYPES.join(", ")}`,
    );
  }

  if (file.size > IMG_MAX_SIZE) {
    errors.push(
      `File size exceeds the maximum of ${IMG_MAX_SIZE / (1024 * 1024)}MB`,
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
        `Image dimensions exceed the maximum allowed size of ${IMG_MAX_WIDTH}x${IMG_MAX_HEIGHT}px`,
      );
    }
  } catch {
    errors.push(`Uploaded file is not a valid image`);
  }

  return errors;
}

export async function getImgFilesErrs(
  files: File[] | FileList,
  category: FirebaseBucket,
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
  for (const file of files) {
    dataTransfer.items.add(file);
  }

  return dataTransfer.files;
}

/**
 * Generates and downloads a CSV file from an array of objects.
 * @param filename - The desired filename for the downloaded file (e.g., "users.csv").
 * @param headers - An array of strings representing the column headers.
 * @param data - An array of objects to be written as rows.
 * @param getRow - A function that takes a data object and returns an array of value for that row.
 */
export function exportToCsv<T>(
  filename: string,
  headers: string[],
  data: T[],
  getVals: (item: T) => (string | number | boolean | null)[],
): void {
  const csvRows = [headers.join(",")];

  for (const item of data) {
    const vals = getVals(item).map((val) => {
      const stringVal = String(val || "N/A");
      const escapedVal = stringVal.replaceAll('"', '""'); // Escape double quotes by doubling them and wrap the whole value in double quotes
      return `"${escapedVal}"`;
    });
    csvRows.push(vals.join(","));
  }

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset-utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function getExcelFileErrs(
  file: File,
  category: "grn",
): Promise<string[]> {
  const errors = [];

  // 1. Basic file validation (type and size)
  // Note: file.type might be empty for some .xlsx files on Windows, so we check extension as well
  const fileName = file.name.toLowerCase();
  const hasValidExtension = GRN_FILE_IMPORT_EXTENSIONS.some((ext) =>
    fileName.endsWith(ext),
  );
  if (!hasValidExtension) {
    errors.push(
      `Invalid file type. Allowed types are: ${GRN_FILE_IMPORT_EXTENSIONS.join(
        ", ",
      )}`,
    );
    return errors;
  }

  if (file.size > GRN_FILE_IMPORT_MAX_SIZE) {
    errors.push(
      `File size exceeds the maximum of ${
        GRN_FILE_IMPORT_MAX_SIZE / (1024 * 1024)
      }MB`,
    );
    return errors;
  }

  // 2. Content validation (headers & duplicates)
  // At the moment we only have GRN excel import, so we directly implement here...
  try {
    const buffer = await file.arrayBuffer();
    const fileExt = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();

    let fileHeaders: string[] = [];
    const serials = new Set<string>();
    const imeis = new Set<string>();
    let hasDataRows = false;

    if (fileExt === ".csv") {
      // Handle CSV files
      const text = new TextDecoder().decode(buffer);
      const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => !!line);

      if (lines.length === 0) {
        errors.push("The uploaded file is empty.");
        return errors;
      }

      // Parse header row
      fileHeaders = lines[0].split(",").map((h) => removeOddSpaces(h));

      // Check if all required headers are present
      const missingHeaders = GRN_FILE_IMPORT_HEADERS.filter(
        (requiredHeader) => !fileHeaders.includes(requiredHeader),
      );
      if (missingHeaders.length > 0) {
        errors.push(
          `Missing required headers: ${missingHeaders.join(
            ", ",
          )}. Please use the provided template for importing GRNs.`,
        );
        return errors;
      }

      // Check for unknown headers
      const unknownHeaders = fileHeaders.filter(
        (header) =>
          header &&
          !(GRN_FILE_IMPORT_HEADERS as readonly string[]).includes(header),
      );
      if (unknownHeaders.length > 0) {
        errors.push(
          `Unknown headers found: ${unknownHeaders.join(
            ", ",
          )}. Please use the provided template for importing GRNs.`,
        );
        return errors;
      }

      // Validate data rows
      for (let i = 1; i < lines.length; i++) {
        hasDataRows = true;
        const values = lines[i].split(",").map((v) => removeOddSpaces(v));

        let serial: string | null = null;
        let imei: string | null = null;

        fileHeaders.forEach((header, index) => {
          if (header === "supplierSerialNumber") serial = values[index] || null;
          else if (header === "supplierImeiNumber")
            imei = values[index] || null;
        });

        if (!serial) {
          errors.push(`Row ${i + 1}: Missing 'supplierSerialNumber'.`);
        } else if (serials.has(serial)) {
          errors.push(
            `Row ${i + 1}: Duplicate 'supplierSerialNumber' "${serial}".`,
          );
        } else {
          serials.add(serial);
        }

        if (imei) {
          if (imeis.has(imei)) {
            errors.push(`Row ${i + 1}: Duplicate 'imei' "${imei}".`);
          } else {
            imeis.add(imei);
          }
        }
      }
    } else {
      // Handle .xlsx, .xls files
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet(1); // Get the first worksheet
      if (!worksheet) {
        errors.push("The uploaded file is empty or has no sheets.");
        return errors;
      }

      // A. Validate headers
      const headerRow = worksheet.getRow(1);
      const fileHeaders: string[] = [];

      headerRow.eachCell((cell, colNumber) => {
        const header = removeOddSpaces(cell.text);
        fileHeaders[colNumber] = header;
      });

      // Check if all required headers are present
      const missingHeaders = GRN_FILE_IMPORT_HEADERS.filter(
        (requiredHeader) => !fileHeaders.includes(requiredHeader),
      );
      if (missingHeaders.length > 0) {
        errors.push(
          `Missing required headers: ${missingHeaders.join(
            ", ",
          )}. Please use the provided template for importing GRNs.`,
        );
        return errors;
      }

      // Check for unknown headers (optional, strict mode)
      const unknownHeaders = fileHeaders.filter(
        (header) =>
          header &&
          !(GRN_FILE_IMPORT_HEADERS as readonly string[]).includes(header),
      );
      if (unknownHeaders.length > 0) {
        errors.push(
          `Unknown headers found: ${unknownHeaders.join(
            ", ",
          )}. Please use the provided template for importing GRNs.`,
        );
        return errors;
      }

      // B. Validate data & check duplicates
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        hasDataRows = true;

        let serial: string | null = null;
        let imei: string | null = null;

        row.eachCell((cell, colNumber) => {
          const header = fileHeaders[colNumber];
          const cellVal = cell.text ? removeOddSpaces(cell.text) : "";

          if (header === "supplierSerialNumber") serial = cellVal;
          else if (header === "supplierImeiNumber") imei = cellVal;
        });

        // Check serial
        if (!serial) {
          errors.push(`Row ${rowNumber}: Missing 'supplierSerialNumber'.`);
        } else if (serials.has(serial)) {
          errors.push(
            `Row ${rowNumber}: Duplicate 'supplierSerialNumber' "${serial}".`,
          );
        } else {
          serials.add(serial);
        }

        // Check IMEI (if present)
        if (imei) {
          if (imeis.has(imei)) {
            errors.push(`Row ${rowNumber}: Duplicate 'imei' "${imei}".`);
          } else {
            imeis.add(imei);
          }
        }
      });
    }

    if (!hasDataRows) {
      errors.push("The uploaded file contains no data rows.");
    }
  } catch (error) {
    console.error("Excel parsing error:", error);
    errors.push(
      `Error parsing Excel file. Please ensure the file is a valid .xlsx format.`,
    );
  }

  return errors;
}

export async function countExcelFileRows(file: File): Promise<number> {
  try {
    const buffer = await file.arrayBuffer();
    const fileName = file.name.toLowerCase();
    const fileExt = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();

    if (fileExt === ".csv") {
      // Handle CSV files
      const text = new TextDecoder().decode(buffer);
      const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => !!line);
      return lines.length;
    }

    // Handle .xlsx, .xls files
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet(1); // Get the first worksheet
    if (!worksheet) {
      return 0;
    }

    return worksheet.rowCount;
  } catch (error) {
    console.error("Excel parsing error:", error);
    return 0;
  }
}
