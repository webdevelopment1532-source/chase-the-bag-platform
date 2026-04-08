// Cyber-secure, mutation-safe JSON utility
export function safeJsonParse<T = any>(input: string, fallback: T = null as any): T {
  try {
    return JSON.parse(input);
  } catch {
    return fallback;
  }
}

export function safeJsonStringify(input: any, fallback = '{}'): string {
  try {
    return JSON.stringify(input);
  } catch {
    return fallback;
  }
}
