import { inspectStr } from '../inspectStr.js';

describe('inspectStr', () => {
  it('handles null and undefined values', () => {
    expect(inspectStr(null)).toEqual('null');
    expect(inspectStr(undefined)).toEqual('null');
  });

  it('correctly print various strings', () => {
    expect(inspectStr('')).toEqual('``');
    expect(inspectStr('a')).toEqual('`a`');
    expect(inspectStr('"')).toEqual('`"`');
    expect(inspectStr("'")).toEqual("`'`");
    expect(inspectStr('\\"')).toEqual('`\\"`');
  });
});
