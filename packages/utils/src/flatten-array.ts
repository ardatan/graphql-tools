export const flattenArray = (arr: any): any[] =>
  arr.reduce((acc: any, next: any) => acc.concat(Array.isArray(next) ? flattenArray(next) : next), []);
