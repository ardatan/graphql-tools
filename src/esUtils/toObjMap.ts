export default function toObjMap(obj: any): Record<string, any> {
  if (Object.getPrototypeOf(obj) === null) {
    return obj;
  }

  return Object.entries(obj).reduce((map, [key, value]) => {
    map[key] = value;
    return map;
  }, Object.create(null));
}
