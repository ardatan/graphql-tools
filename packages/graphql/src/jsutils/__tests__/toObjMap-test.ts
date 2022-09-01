import type { ObjMapLike } from '../ObjMap.js';
import { toObjMap } from '../toObjMap.js';

// Workaround to make both ESLint happy
const __proto__ = '__proto__';

describe('toObjMap', () => {
  it('convert undefined to ObjMap', () => {
    const result = toObjMap(undefined);
    expect(result).toEqual({});
    expect(Object.getPrototypeOf(result)).toEqual(null);
  });

  it('convert null to ObjMap', () => {
    const result = toObjMap(null);
    expect(result).toEqual({});
    expect(Object.getPrototypeOf(result)).toEqual(null);
  });

  it('convert empty object to ObjMap', () => {
    const result = toObjMap({});
    expect(result).toEqual({});
    expect(Object.getPrototypeOf(result)).toEqual(null);
  });

  it('convert object with own properties to ObjMap', () => {
    const obj: ObjMapLike<string> = Object.freeze({ foo: 'bar' });

    const result = toObjMap(obj);
    expect(result).toEqual(obj);
    expect(Object.getPrototypeOf(result)).toEqual(null);
  });

  it('convert object with __proto__ property to ObjMap', () => {
    const protoObj = Object.freeze({ toString: false });
    const obj = Object.create(null);
    obj[__proto__] = protoObj;
    Object.freeze(obj);

    const result = toObjMap(obj);
    expect(Object.keys(result)).toEqual(['__proto__']);
    expect(Object.getPrototypeOf(result)).toEqual(null);
    expect(result[__proto__]).toEqual(protoObj);
  });

  it('passthrough empty ObjMap', () => {
    const objMap = Object.create(null);
    expect(toObjMap(objMap)).toEqual(objMap);
  });

  it('passthrough ObjMap with properties', () => {
    const objMap = Object.freeze({
      __proto__: null,
      foo: 'bar',
    });
    expect(toObjMap(objMap)).toEqual(objMap);
  });
});
