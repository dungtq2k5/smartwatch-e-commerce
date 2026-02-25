import { NextFunction, Request, Response } from "express";
import {
  isNoneArrObj,
  isValidDateTimeString,
  isValidNumString,
  removeOddSpaces,
} from "../../../common/utils.common";
import { isPresent } from "../utils";
import { HttpError } from "../errorHandler";
import { GRN_FILE_IMPORT_HEADERS } from "../../../common/configs.common";
import ExcelJS from "exceljs";

function sanitizeGrnInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing GRN create input...");

  // When sending FromData, objects often come as JSON strings -> need to pare back to objects
  if (req.body.grn && typeof req.body.grn === "string") {
    try {
      req.body.grn = JSON.parse(req.body.grn);
    } catch {
      return next(new HttpError(400, "Invalid JSON format in 'grn' field."));
    }
  }

  // Convert numeric strings to numbers, sanitize strings
  if (req.body.grn) {
    const { name, totalPriceCents, quantity, notes } = req.body.grn;

    if (typeof name === "string") {
      req.body.grn.name = removeOddSpaces(name);
    }
    if (typeof notes === "string") {
      req.body.grn.notes = removeOddSpaces(notes);
    }
    if (typeof totalPriceCents === "string") {
      req.body.grn.totalPriceCents = Number(totalPriceCents);
    }
    if (typeof quantity === "string") {
      req.body.grn.quantity = Number(quantity);
    }
  }

  next();
}

function sanitizeGrnSearchInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing GRN search input...");

  // Since req.query can't be modifiable so we create a new query obj for the request
  const sanitizedQuery = { ...req.query };
  const { searchTerm } = sanitizedQuery;

  if (typeof searchTerm === "string") {
    sanitizedQuery.searchTerm = removeOddSpaces(searchTerm);
  }

  req["sanitizedQuery"] = sanitizedQuery;
  next();
}

function sanitizeGrnUpdateInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing GRN update input...");
  const { name, notes, inventoryMovement } = req.body;

  if (typeof name === "string") {
    req.body.name = removeOddSpaces(name);
  }
  if (typeof notes === "string") {
    req.body.notes = removeOddSpaces(notes);
  }
  if (typeof inventoryMovement?.notes === "string") {
    req.body.inventoryMovement.notes = removeOddSpaces(inventoryMovement.notes);
  }

  next();
}

export function inputSanitizer(
  type: "create" | "search" | "update"
): (req: Request, res: Response, next: NextFunction) => void {
  switch (type) {
    case "create":
      return sanitizeGrnInput;
    case "search":
      return sanitizeGrnSearchInput;
    case "update":
      return sanitizeGrnUpdateInput;
  }
}

export function verifyGrnInput(
  type: "create" | "search" | "update"
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("▶️ ", `Verifying GRN ${type} input...`);

    const errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          const { modelVariationId, providerId, grn, instances } = req.body;

          if (modelVariationId === undefined) {
            errors.push("Model Variation ID is required.");
          } else if (
            typeof modelVariationId !== "string" ||
            !modelVariationId
          ) {
            errors.push("Model Variation ID must be a non-empty string.");
          }
          if (providerId === undefined) {
            errors.push("Provider ID is required.");
          } else if (typeof providerId !== "string" || !providerId) {
            errors.push("Provider ID must be a non-empty string.");
          }
          if (!grn) {
            errors.push("GRN data is required.");
          } else if (typeof grn !== "object" || Object.keys(grn).length === 0) {
            errors.push("GRN data must be a non-empty object.");
          } else {
            const { name, totalPriceCents, quantity, notes, stateId } = grn;

            if (!name) {
              errors.push("GRN name is required.");
            } else if (typeof name !== "string") {
              errors.push("GRN name must be a string.");
            }
            if (totalPriceCents === undefined) {
              errors.push("Total price is required.");
            } else if (
              typeof totalPriceCents !== "number" ||
              totalPriceCents < 0
            ) {
              errors.push("Total price must be a non-negative number.");
            }
            if (quantity === undefined) {
              errors.push("Quantity is required.");
            } else if (typeof quantity !== "number" || quantity < 0) {
              errors.push("Quantity must be a non-negative number.");
            }
            if (isPresent(notes) && typeof notes !== "string") {
              errors.push("Notes must be a string.");
            }
            if (isPresent(stateId) && typeof stateId !== "string") {
              errors.push("State ID must be a string.");
            }
          }
          if (!Array.isArray(instances) || instances.length === 0) {
            errors.push("At least one instance is required.");
          } else {
            // For checking duplicate, use Set instead of normal array for better performance "O(n^2)" to "O(n)"
            const validSerialNumbers = new Set<string>();
            const validImeiNumbers = new Set<string>();

            instances.forEach((instance, idx) => {
              const { supplierSerialNumber, supplierImeiNumber } = instance;

              if (!supplierSerialNumber) {
                errors.push(
                  "Supplier Serial Number is required for each instance."
                );
              } else if (typeof supplierSerialNumber !== "string") {
                errors.push("Supplier Serial Number must be a string.");
              } else if (validSerialNumbers.has(supplierSerialNumber)) {
                errors.push(
                  `Duplicate Supplier Serial Number found: "${supplierSerialNumber}" at row ${
                    idx + 2
                  }.`
                );
              } else {
                validSerialNumbers.add(supplierSerialNumber);
              }

              if (isPresent(supplierImeiNumber)) {
                if (typeof supplierImeiNumber !== "string") {
                  errors.push("Supplier IMEI Number must be a string.");
                } else if (validImeiNumbers.has(supplierImeiNumber)) {
                  errors.push(
                    `Duplicate Supplier IMEI Number found: "${supplierImeiNumber}" at row ${
                      idx + 2
                    }.`
                  );
                } else {
                  validImeiNumbers.add(supplierImeiNumber);
                }
              }
            });
          }

          // If not errors -> check grn.quantity matches instances.length
          if (errors.length === 0 && grn.quantity !== instances.length) {
            errors.push(
              `GRN quantity (${grn.quantity}) does not match number of instance rows (${instances.length}).`
            );
          }
          break;
        }
        case "search": {
          const {
            limit,
            offset,
            searchTerm,
            totalPriceCentsMin,
            totalPriceCentsMax,
            createdAtFrom,
            createdAtTo,
            stateId,
          } = req["sanitizedQuery"] || req.query;

          if (limit !== undefined) {
            if (!isValidNumString(limit)) {
              errors.push("limit must be a valid number string.");
            } else if (Number(limit) <= 0) {
              errors.push("limit must be greater than 0.");
            }
          }
          if (offset !== undefined) {
            if (!isValidNumString(offset)) {
              errors.push("offset must be a valid number string.");
            } else if (Number(offset) < 0) {
              errors.push("offset must be greater than or equal to 0.");
            }
          }
          if (
            searchTerm !== undefined &&
            (typeof searchTerm !== "string" || !searchTerm)
          ) {
            errors.push("search term must be a non-empty string.");
          }
          if (totalPriceCentsMin !== undefined) {
            if (!isValidNumString(totalPriceCentsMin)) {
              errors.push("totalPriceCentsMin must be a valid number string.");
            } else if (Number.parseInt(totalPriceCentsMin, 10) < 0) {
              errors.push("totalPriceCentsMin must be a non-negative number.");
            }
          }
          if (totalPriceCentsMax !== undefined) {
            if (!isValidNumString(totalPriceCentsMax)) {
              errors.push("totalPriceCentsMax must be a valid number string.");
            } else if (Number.parseInt(totalPriceCentsMax, 10) < 0) {
              errors.push("totalPriceCentsMax must be a non-negative number.");
            }
          }
          if (
            totalPriceCentsMin !== undefined &&
            totalPriceCentsMax !== undefined &&
            Number.parseInt(totalPriceCentsMin, 10) >
              Number.parseInt(totalPriceCentsMax, 10)
          ) {
            errors.push(
              "totalPriceCentsMin cannot be greater than totalPriceCentsMax."
            );
          }

          if (
            createdAtFrom !== undefined &&
            !isValidDateTimeString(createdAtFrom)
          ) {
            errors.push("createdAtFrom must be a valid date-time string.");
          }
          if (
            createdAtTo !== undefined &&
            !isValidDateTimeString(createdAtTo)
          ) {
            errors.push("createdAtTo must be a valid date-time string.");
          }
          if (
            createdAtFrom !== undefined &&
            createdAtTo !== undefined &&
            new Date(createdAtFrom) > new Date(createdAtTo)
          ) {
            errors.push("createdAtFrom cannot be later than createdAtTo.");
          }
          if (stateId !== undefined && typeof stateId !== "string") {
            errors.push("stateId must be a string.");
          }

          break;
        }
        case "update": {
          const {
            name,
            providerId,
            totalPriceCents,
            notes,
            stateId,
            inventoryMovement,
          } = req.body;

          if (name !== undefined && (typeof name !== "string" || !name)) {
            errors.push("Name must be a non-empty string.");
          }
          if (
            providerId !== undefined &&
            (typeof providerId !== "string" || !providerId)
          ) {
            errors.push("Provider ID must be a non-empty string.");
          }
          if (
            totalPriceCents !== undefined &&
            (typeof totalPriceCents !== "number" || totalPriceCents < 0)
          ) {
            errors.push("Total price must be a non-negative number.");
          }
          if (isPresent(notes) && (typeof notes !== "string" || !notes)) {
            errors.push("Notes must be a non-empty string.");
          }
          if (
            stateId !== undefined &&
            (typeof stateId !== "string" || !stateId)
          ) {
            errors.push("State ID must be a non-empty string.");
          }
          if (inventoryMovement === undefined) {
            errors.push("Inventory Movement data is required.");
          } else if (
            !isNoneArrObj(inventoryMovement) ||
            Object.keys(inventoryMovement).length === 0
          ) {
            errors.push("Inventory Movement must be a non-empty object.");
          } else {
            const { typeId, quantity, notes } = inventoryMovement;

            if (typeId === undefined) {
              errors.push("Inventory Movement type ID is required.");
            } else if (typeof typeId !== "string" || !typeId) {
              errors.push(
                "Inventory Movement type ID must be a non-empty string."
              );
            }
            if (quantity === undefined) {
              errors.push("Inventory Movement quantity is required.");
            } else if (
              typeof quantity !== "number" ||
              ![-1, 1].includes(quantity)
            ) {
              errors.push(
                "Inventory Movement quantity must be either 1 or -1."
              );
            }
            if (isPresent(notes) && (typeof notes !== "string" || !notes)) {
              errors.push(
                "Inventory Movement notes must be a non-empty string."
              );
            }
          }

          break;
        }
      }

      if (errors.length > 0) {
        throw new HttpError(400, errors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export async function parseExcelToJson(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Parsing file to JSON...");

  try {
    // Multer will put the file in req.file, if no file found -> throw error
    if (!req.file) {
      throw new HttpError(500, "File not found during parsing.");
    }

    const fileName = req.file.originalname.toLowerCase();
    const isCsv = fileName.endsWith(".csv");

    const instances: any[] = isCsv
      ? await parseCSVToJson(req.file.buffer)
      : await parseExcelFileToJson(req.file.buffer);

    if (instances.length === 0) {
      throw new HttpError(400, "The uploaded file contains no data rows.");
    }

    req.body.instances = instances;
    next();
  } catch (error) {
    next(error);
  }
}

async function parseExcelFileToJson(buffer: Buffer): Promise<any[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new HttpError(400, "The uploaded file is empty or has no sheets.");
  }

  const rawRows: any[] = [];
  const headers: string[] = [];

  // Get headers from Row 1
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    const header = removeOddSpaces(cell.text);
    if (!GRN_FILE_IMPORT_HEADERS.includes(header as any)) {
      throw new HttpError(
        400,
        `Invalid header found: "${header}". Please use the provided template for importing GRNs.`
      );
    }
    headers[colNumber] = header;
  });

  // Iterate data from Row 2 onwards
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const rowData: any = {};
    let hasData = false;

    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        const val =
          cell.value && typeof cell.value === "object" && "text" in cell.value
            ? (cell.value as any).text
            : cell.value;

        rowData[header] = val;
        hasData = true;
      }
    });

    if (hasData) {
      rawRows.push(rowData);
    }
  });

  return rawRows;
}

async function parseCSVToJson(buffer: Buffer): Promise<any[]> {
  const text = buffer.toString("utf-8");
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !!line);

  if (lines.length === 0) {
    throw new HttpError(400, "The uploaded file is empty.");
  }

  const headers = lines[0].split(",").map((h) => removeOddSpaces(h));

  // Validate headers
  const invalidHeaders = headers.filter(
    (header) => !GRN_FILE_IMPORT_HEADERS.includes(header as any)
  );
  if (invalidHeaders.length > 0) {
    throw new HttpError(
      400,
      `Invalid headers found: "${invalidHeaders.join(
        ", "
      )}". Please use the provided template for importing GRNs.`
    );
  }

  const rawRows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => removeOddSpaces(v));

    const rowData: any = {};
    let hasData = false;

    headers.forEach((header, index) => {
      const val = values[index] || null;
      if (val) {
        rowData[header] = val;
        hasData = true;
      }
    });

    if (hasData) {
      rawRows.push(rowData);
    }
  }

  return rawRows;
}
