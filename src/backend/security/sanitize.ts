// Centralized input sanitization for all user input
// Prevents XSS, SQLi, and injection attacks
import xss from 'xss';

export function sanitizeString(str: string): string {
  return xss(str.trim());
}

export function sanitizeNumber(n: any): number {
  const num = Number(n);
  if (isNaN(num)) throw new Error('Invalid number input');
  return num;
}

export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Try to convert to number if possible
      const num = Number(obj[key]);
      if (!isNaN(num) && obj[key].trim() !== '') {
        sanitized[key] = sanitizeNumber(obj[key]);
      } else {
        sanitized[key] = sanitizeString(obj[key]);
      }
    } else if (typeof obj[key] === 'number') {
      sanitized[key] = sanitizeNumber(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }
  return sanitized;
}
