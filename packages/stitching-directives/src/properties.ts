import { PropertyTree } from './types';

export function addKey(object: Record<string, any>, path: Array<string | number>, value: any) {
  const initialSegment = path[0];
  if (path.length === 1) {
    object[initialSegment] = value;
    return;
  }

  let field = object[initialSegment];
  if (field != null) {
    addKey(field, path.slice(1), value);
    return;
  }

  if (typeof path[1] === 'string') {
    field = Object.create(null);
  } else {
    field = [];
  }
  addKey(field, path.slice(1), value);
  object[initialSegment] = field;
}

export function getKey(object: Record<string, any>, path: Array<string>): any {
  return path.reduce((acc, pathSegment) => acc[pathSegment], object);
}

export function getKeys(object: Record<string, any>, propertyTree: PropertyTree): any {
  const newObject = Object.create(null);
  Object.entries(propertyTree).forEach(([key, subKey]) => {
    if (subKey == null) {
      newObject[key] = object[key];
    } else {
      newObject[key] = getKeys(object[key], subKey);
    }
  });
  return newObject;
}

export function propertyTreeFromPaths(paths: Array<Array<string>>): PropertyTree {
  const propertyTree = Object.create(null);
  paths.forEach(path => {
    addKey(propertyTree, path, null);
  });
  return propertyTree;
}
