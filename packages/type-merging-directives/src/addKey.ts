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
