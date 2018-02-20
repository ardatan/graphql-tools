// depth-first search of any object.
export type ObjectVisitor = (
  key: string,
  value: any,
  parents: Array<string>,
) => any | undefined | null;

export default function visitObject(object: any, visitor: ObjectVisitor) {
  return visitObjectImpl(object, visitor, []);
}

function visitObjectImpl(
  object: any,
  visitor: ObjectVisitor,
  parents: Array<string>,
) {
  if (isObject(object)) {
    const result = {};
    Object.keys(object).forEach(key => {
      const value = object[key];
      const processedValue = visitor(key, value, parents);
      let nextValue;
      if (typeof processedValue === 'undefined') {
        nextValue = value;
      } else if (processedValue === null) {
        return;
      } else {
        nextValue = processedValue;
      }
      result[key] = visitObjectImpl(nextValue, visitor, [key, ...parents]);
    });
    return result;
  } else {
    return object;
  }
}

function isObject(item: any): Boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}
