import { IndexedObject } from '../Interfaces';

export default function each<V>(
  arrayOrObject: IndexedObject<V>,
  callback: (value: V, key: string) => void,
) {
  Object.keys(arrayOrObject).forEach(key => {
    callback(arrayOrObject[key], key);
  });
}
