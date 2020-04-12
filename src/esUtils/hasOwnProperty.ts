const hasOwn = Object.prototype.hasOwnProperty;

export function hasOwnProperty(object: any, propertyName: string): boolean {
  return hasOwn.call(object, propertyName);
}
