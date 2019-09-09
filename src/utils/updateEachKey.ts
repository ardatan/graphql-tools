import { IndexedObject } from '../Interfaces';

// A more powerful version of each that has the ability to replace or remove
// array or object keys.
export default function updateEachKey<V>(
  arrayOrObject: IndexedObject<V>,
  // The callback can return nothing to leave the key untouched, null to remove
  // the key from the array or object, or a non-null V to replace the value.
  callback: (value: V, key: string) => V | void,
) {
  let deletedCount = 0;

  Object.keys(arrayOrObject).forEach(key => {
    const result = callback(arrayOrObject[key], key);

    if (typeof result === 'undefined') {
      return;
    }

    if (result === null) {
      delete arrayOrObject[key];
      deletedCount++;
      return;
    }

    arrayOrObject[key] = result;
  });

  if (deletedCount > 0 && Array.isArray(arrayOrObject)) {
    // Remove any holes from the array due to deleted elements.
    arrayOrObject.splice(0).forEach(elem => {
      arrayOrObject.push(elem);
    });
  }
}
