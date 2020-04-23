export default function toObjMap<T>(obj: {
  [key: string]: T;
}): Record<string, T> {
  if (Object.getPrototypeOf(obj) === null) {
    return obj;
  }

  return Object.entries(obj).reduce((map, [key, value]) => {
    map[key] = value;
    return map;
  }, Object.create(null));
}
