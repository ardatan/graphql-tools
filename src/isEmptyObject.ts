export default function isEmptyObject(obj: Object): Boolean {
  if (!obj) {
    return true;
  }

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return false;
    }
  }
  return true;
}
