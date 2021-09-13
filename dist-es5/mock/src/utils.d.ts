import { Ref, KeyTypeConstraints } from './types';
export declare function uuidv4(): string;
export declare const randomListLength: () => number;
export declare const takeRandom: <T>(arr: T[]) => T;
export declare function makeRef<KeyT extends KeyTypeConstraints = string>(typeName: string, key: KeyT): Ref<KeyT>;
export declare function isObject(thing: any): boolean;
export declare function copyOwnPropsIfNotPresent(target: Record<string, any>, source: Record<string, any>): void;
export declare function copyOwnProps(
  target: Record<string, any>,
  ...sources: Array<Record<string, any>>
): Record<string, any>;
