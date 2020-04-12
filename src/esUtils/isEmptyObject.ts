export default function isEmptyObject(obj: Record<string, any>): boolean {
  if (obj == null) {
    return true;
  }

  return Object.keys(obj).length === 0;
}
