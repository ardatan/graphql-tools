import { IndexedObject } from '../Interfaces';
export default function updateEachKey<V>(arrayOrObject: IndexedObject<V>, updater: (value: V, key: string) => void | null | V): void;
