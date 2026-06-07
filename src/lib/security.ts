/**
 * Shared security utilities for input validation, sanitization,
 * and prevention of Cross-Site Scripting (XSS) and Injection attacks.
 */

/**
 * Validates if a value is a valid email address.
 */
export function isValidEmail(email: any): boolean {
  if (typeof email !== 'string') return false;
  // RFC 5322 compliant regex for robust email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length < 254;
}

/**
 * Validates if the input is a valid string with correct lengths constraints.
 */
export function isValidString(val: any, minLength = 1, maxLength = 50000): boolean {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength;
}

/**
 * Sanitizes input strings to prevent XSS (Cross-Site Scripting) attacks by escaping HTML tags.
 */
export function sanitizeString(val: any): string {
  if (typeof val !== 'string') return '';
  
  // Bypass base64 image strings completely, as they can't cause HTML XSS in plain text context and we don't want to corrupt them
  if (val.startsWith('data:image/') && val.includes('base64,')) {
    return val;
  }
  
  // Bypass valid URLs safely to avoid corrupting URL parameters and slashes
  if (/^https?:\/\//i.test(val)) {
    // Escape tags even within URLs to prevent javascript: pseudo-protocol or malformed injection, but keep normal URL characters intact
    return val.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Normal text strings get complete escaping
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Checks for common SQL injection characters/patterns.
 * If true, indicates a possible SQL injection attempt.
 */
export function hasSqlInjectionPattern(val: any): boolean {
  if (typeof val !== 'string') return false;
  // Look for classic SQL keywords like UNION, SELECT, DROP, etc., combined with operators or comment indicators
  const sqlRegex = /\b(union\s+all|union\s+select|select\s+.*\s+from|insert\s+into|delete\s+from|drop\s+table|alter\s+table|update\s+.*\s+set)\b|(--)|(\/\*)|(';)/i;
  return sqlRegex.test(val);
}

/**
 * Cleans user-entered strings from SQL Injection risk by removing critical characters (like double-dash or raw unescaped statements)
 */
export function cleanSqlInput(val: any): string {
  if (typeof val !== 'string') return '';
  // Strip off comments and clean single/double-quotes
  return val
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/'/g, "''"); // SQL standards escape single quotes by doubling them
}
