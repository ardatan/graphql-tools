export function reannotateObject<T extends object>(newObject: T, oldObject: T): T {
  if (newObject == null) {
    return newObject;
  }

  const symbols = Object.getOwnPropertySymbols(oldObject);
  symbols.forEach(symbol => {
    if (!(symbol in newObject)) {
      newObject[symbol] = oldObject[symbol];
    }
  });

  const names = Object.getOwnPropertyNames(oldObject);
  names.forEach(name => {
    if (!(name in newObject)) {
      newObject[name] = oldObject[name];
    }
  });
  return newObject;
}
