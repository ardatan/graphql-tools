export function stripWhitespaces(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}
