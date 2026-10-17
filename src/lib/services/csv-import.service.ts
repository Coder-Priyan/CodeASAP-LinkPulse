import { validateUrl } from "../validations/url-validator";
import { validateCustomAlias } from "../validations/alias-validator";
import { isDomainBlocked } from "./blocked-domain.service";
import { createLink } from "./link.service";
import { checkBulkImportRateLimit } from "./rate-limiter";
import { db } from "../db";

export const MAX_CSV_SIZE_BYTES = 1024 * 1024; // 1 MB
export const MAX_CSV_ROWS = 200;

export interface CsvParsedRow {
  lineNumber: number;
  rawUrl: string;
  rawAlias?: string;
  rawTitle?: string;
  sanitizedTitle?: string;
  isValid: boolean;
  error?: string;
}

export interface CsvPreviewResult {
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  rows: CsvParsedRow[];
}

export interface CsvImportSummary {
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  created: Array<{
    lineNumber: number;
    id: string;
    code: string;
    destinationUrl: string;
    title?: string | null;
  }>;
  skipped: Array<{
    lineNumber: number;
    destinationUrl: string;
    reason: string;
  }>;
}

/**
 * Neutralizes CSV formula injection.
 * Any text field beginning with =, +, -, or @ is prefixed with an apostrophe (')
 * so that spreadsheet engines treat the cell as plain text rather than executing code.
 */
export function neutralizeCsvFormula(value: string): string {
  if (!value) return value;
  const trimmed = value.trim();
  if (/^[=+\-@]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

/**
 * Robust RFC-4180 compliant CSV parser that handles:
 * - UTF-8 BOM (\uFEFF)
 * - CRLF (\r\n) and LF (\n)
 * - Double-quote escapes ("")
 * - Commas and newlines inside quoted fields
 * - Preserves accurate line numbers per record
 */
export function parseCsvRecords(text: string): { lineNumber: number; fields: string[] }[] {
  // Strip UTF-8 BOM if present
  const clean = text.replace(/^\uFEFF/, "");
  
  const records: { lineNumber: number; fields: string[] }[] = [];
  let currentFields: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let recordStartLine = 1;
  let currentLine = 1;
  let i = 0;

  while (i < clean.length) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        if (char === "\n") {
          currentLine++;
        }
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ",") {
        currentFields.push(currentField);
        currentField = "";
        i++;
        continue;
      } else if (char === "\r") {
        if (nextChar === "\n") {
          i++; // Skip \r in \r\n
        }
        currentFields.push(currentField);
        currentField = "";
        records.push({ lineNumber: recordStartLine, fields: currentFields });
        currentFields = [];
        currentLine++;
        recordStartLine = currentLine;
        i++;
        continue;
      } else if (char === "\n") {
        currentFields.push(currentField);
        currentField = "";
        records.push({ lineNumber: recordStartLine, fields: currentFields });
        currentFields = [];
        currentLine++;
        recordStartLine = currentLine;
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push final field/record if not empty
  if (currentField !== "" || currentFields.length > 0) {
    currentFields.push(currentField);
    records.push({ lineNumber: recordStartLine, fields: currentFields });
  }

  return records;
}

/**
 * Previews and validates a CSV payload for bulk link import.
 */
export async function previewCsvImport(
  csvContent: string,
  userId: string
): Promise<CsvPreviewResult> {
  // 1. File size check (1 MB limit)
  const byteLength = Buffer.byteLength(csvContent, "utf8");
  if (byteLength > MAX_CSV_SIZE_BYTES) {
    throw new Error(
      `File size (${(byteLength / 1024 / 1024).toFixed(2)} MB) exceeds the maximum allowed limit of 1 MB.`
    );
  }

  const rawRecords = parseCsvRecords(csvContent);
  if (rawRecords.length === 0) {
    throw new Error("The uploaded CSV file is empty.");
  }

  // 2. Identify headers (first non-empty record)
  const headerRecord = rawRecords[0];
  const headers = headerRecord.fields.map((h) => h.trim().toLowerCase());

  const urlIdx = headers.findIndex(
    (h) => h === "destination_url" || h === "url" || h === "destinationurl"
  );
  if (urlIdx === -1) {
    throw new Error(
      "CSV must contain a 'destination_url' column header. Columns found: " +
        (headers.join(", ") || "none")
    );
  }

  const aliasIdx = headers.findIndex((h) => h === "alias" || h === "short_code" || h === "slug");
  const titleIdx = headers.findIndex((h) => h === "title" || h === "name");

  const dataRecords = rawRecords.slice(1).filter((r) => {
    // Filter out completely blank lines
    return r.fields.some((f) => f.trim().length > 0);
  });

  // 3. Row count check (200 rows limit)
  if (dataRecords.length > MAX_CSV_ROWS) {
    throw new Error(
      `CSV contains ${dataRecords.length} rows, which exceeds the maximum limit of ${MAX_CSV_ROWS} rows per import.`
    );
  }

  const parsedRows: CsvParsedRow[] = [];
  const seenAliasesInFile = new Set<string>();

  for (const record of dataRecords) {
    const rawUrl = (record.fields[urlIdx] || "").trim();
    const rawAlias = aliasIdx !== -1 && record.fields[aliasIdx] ? record.fields[aliasIdx].trim() : undefined;
    const rawTitle = titleIdx !== -1 && record.fields[titleIdx] ? record.fields[titleIdx].trim() : undefined;

    // Neutralize formula injection on text fields
    const sanitizedTitle = rawTitle ? neutralizeCsvFormula(rawTitle) : undefined;

    const row: CsvParsedRow = {
      lineNumber: record.lineNumber,
      rawUrl,
      rawAlias,
      rawTitle,
      sanitizedTitle,
      isValid: true,
    };

    // Validate URL
    const urlValidation = validateUrl(rawUrl);
    if (!urlValidation.isValid || !urlValidation.normalizedUrl) {
      row.isValid = false;
      row.error = urlValidation.error || "Invalid destination URL.";
      parsedRows.push(row);
      continue;
    }

    // Check domain blocklist
    const blockCheck = await isDomainBlocked(urlValidation.normalizedUrl);
    if (blockCheck.isBlocked) {
      row.isValid = false;
      row.error = blockCheck.reason
        ? `Blocked domain: ${blockCheck.reason}`
        : "Destination domain is blocked by system administrators.";
      parsedRows.push(row);
      continue;
    }

    // Validate custom alias if specified
    if (rawAlias && rawAlias.length > 0) {
      const aliasValidation = validateCustomAlias(rawAlias);
      if (!aliasValidation.isValid || !aliasValidation.sanitizedAlias) {
        row.isValid = false;
        row.error = aliasValidation.error || "Invalid alias format.";
        parsedRows.push(row);
        continue;
      }

      const normalizedAlias = aliasValidation.sanitizedAlias.toLowerCase();

      // Check duplicate in the file
      if (seenAliasesInFile.has(normalizedAlias)) {
        row.isValid = false;
        row.error = `Duplicate alias "${rawAlias}" in CSV file.`;
        parsedRows.push(row);
        continue;
      }
      seenAliasesInFile.add(normalizedAlias);

      // Check duplicate in the database
      const existingInDb = await db.link.findUnique({
        where: { code: aliasValidation.sanitizedAlias },
        select: { id: true },
      });

      if (existingInDb) {
        row.isValid = false;
        row.error = `Alias "${rawAlias}" is already taken in the database.`;
        parsedRows.push(row);
        continue;
      }
    }

    parsedRows.push(row);
  }

  const validRowsCount = parsedRows.filter((r) => r.isValid).length;
  const invalidRowsCount = parsedRows.length - validRowsCount;

  return {
    totalRows: parsedRows.length,
    validRowsCount,
    invalidRowsCount,
    rows: parsedRows,
  };
}

/**
 * Executes import for valid rows from a CSV payload.
 * Skips invalid rows and returns a complete summary.
 */
export async function executeCsvImport(
  csvContent: string,
  userId: string
): Promise<CsvImportSummary> {
  // 1. Enforce bulk import rate limit (e.g. 10 bulk imports per hour per user)
  await checkBulkImportRateLimit(userId);

  // 2. Preview and validate rows
  const preview = await previewCsvImport(csvContent, userId);

  const summary: CsvImportSummary = {
    totalRows: preview.totalRows,
    createdCount: 0,
    skippedCount: 0,
    created: [],
    skipped: [],
  };

  for (const row of preview.rows) {
    if (!row.isValid) {
      summary.skippedCount++;
      summary.skipped.push({
        lineNumber: row.lineNumber,
        destinationUrl: row.rawUrl,
        reason: row.error || "Validation failed.",
      });
      continue;
    }

    try {
      // Create link bypassing 15 links/min rate limit (handled by bulk import limiter)
      const createdLink = await createLink({
        destinationUrl: row.rawUrl,
        customAlias: row.rawAlias || undefined,
        title: row.sanitizedTitle || null,
        userId,
        skipRateLimit: true,
      });

      summary.createdCount++;
      summary.created.push({
        lineNumber: row.lineNumber,
        id: createdLink.id,
        code: createdLink.code,
        destinationUrl: createdLink.destinationUrl,
        title: createdLink.title,
      });
    } catch (err: any) {
      summary.skippedCount++;
      summary.skipped.push({
        lineNumber: row.lineNumber,
        destinationUrl: row.rawUrl,
        reason: err?.message || "Failed to create link.",
      });
    }
  }

  return summary;
}
