import { capitalize } from '../capitalize.js';

describe('capitalize', () => {
  it('Converts the first character of string to upper case and the remaining to lower case', () => {
    expect(capitalize('')).toEqual('');

    expect(capitalize('a')).toEqual('A');
    expect(capitalize('A')).toEqual('A');

    expect(capitalize('ab')).toEqual('Ab');
    expect(capitalize('aB')).toEqual('Ab');
    expect(capitalize('Ab')).toEqual('Ab');
    expect(capitalize('AB')).toEqual('Ab');

    expect(capitalize('platypus')).toEqual('Platypus');
    expect(capitalize('PLATYPUS')).toEqual('Platypus');
  });
});
