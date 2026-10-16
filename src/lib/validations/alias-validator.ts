import { isReservedSlug } from "../constants/reserved-slugs";

export interface AliasValidationResult {
  isValid: boolean;
  sanitizedAlias?: string;
  error?: string;
}

const ALIAS_REGEX = /^[a-zA-Z0-9_-]+$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 32;

/**
 * Validates custom short link aliases:
 * - Length between 3 and 32 characters
 * - Only alphanumeric characters, hyphens, and underscores
 * - Not present in reserved slugs
 */
export function validateCustomAlias(alias: string): AliasValidationResult {
  if (!alias || typeof alias !== "string") {
    return { isValid: false, error: "Custom alias is required." };
  }

  const trimmed = alias.trim();

  if (trimmed.length < MIN_LENGTH) {
    return {
      isValid: false,
      error: `Alias must be at least ${MIN_LENGTH} characters long.`,
    };
  }

  if (trimmed.length > MAX_LENGTH) {
    return {
      isValid: false,
      error: `Alias cannot exceed ${MAX_LENGTH} characters.`,
    };
  }

  if (isReservedSlug(trimmed)) {
    return {
      isValid: false,
      error: `"${trimmed}" is a reserved system keyword and cannot be used as an alias.`,
    };
  }

  if (!ALIAS_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: "Alias can only contain letters, numbers, hyphens (-), and underscores (_).",
    };
  }

  return {
    isValid: true,
    sanitizedAlias: trimmed,
  };
}
