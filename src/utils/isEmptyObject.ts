export default function isEmptyObject(obj: Record<string, any>): boolean {
  if (obj == null) {
    return true;
  }

  for (const key in obj) {
    if (Object.hasOwnProperty.call(obj, key)) {
      return false;
    }
  }
  return true;
}
