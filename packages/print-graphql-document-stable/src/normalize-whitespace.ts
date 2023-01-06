export function normalizeWhiteSpace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}
