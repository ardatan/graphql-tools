import { naturalCompare } from '../naturalCompare.js';

describe('naturalCompare', () => {
  it('Handles empty strings', () => {
    expect(naturalCompare('', '')).toEqual(0);

    expect(naturalCompare('', 'a')).toEqual(-1);
    expect(naturalCompare('', '1')).toEqual(-1);

    expect(naturalCompare('a', '')).toEqual(1);
    expect(naturalCompare('1', '')).toEqual(1);
  });

  it('Handles strings of different length', () => {
    expect(naturalCompare('A', 'A')).toEqual(0);
    expect(naturalCompare('A1', 'A1')).toEqual(0);

    expect(naturalCompare('A', 'AA')).toEqual(-1);
    expect(naturalCompare('A1', 'A1A')).toEqual(-1);

    expect(naturalCompare('AA', 'A')).toEqual(1);
    expect(naturalCompare('A1A', 'A1')).toEqual(1);
  });

  it('Handles numbers', () => {
    expect(naturalCompare('0', '0')).toEqual(0);
    expect(naturalCompare('1', '1')).toEqual(0);

    expect(naturalCompare('1', '2')).toEqual(-1);
    expect(naturalCompare('2', '1')).toEqual(1);

    expect(naturalCompare('2', '11')).toEqual(-1);
    expect(naturalCompare('11', '2')).toEqual(1);
  });

  it('Handles numbers with leading zeros', () => {
    expect(naturalCompare('00', '00')).toEqual(0);
    expect(naturalCompare('0', '00')).toEqual(-1);
    expect(naturalCompare('00', '0')).toEqual(1);

    expect(naturalCompare('02', '11')).toEqual(-1);
    expect(naturalCompare('11', '02')).toEqual(1);

    expect(naturalCompare('011', '200')).toEqual(-1);
    expect(naturalCompare('200', '011')).toEqual(1);
  });

  it('Handles numbers embedded into names', () => {
    expect(naturalCompare('a0a', 'a0a')).toEqual(0);
    expect(naturalCompare('a0a', 'a9a')).toEqual(-1);
    expect(naturalCompare('a9a', 'a0a')).toEqual(1);

    expect(naturalCompare('a00a', 'a00a')).toEqual(0);
    expect(naturalCompare('a00a', 'a09a')).toEqual(-1);
    expect(naturalCompare('a09a', 'a00a')).toEqual(1);

    expect(naturalCompare('a0a1', 'a0a1')).toEqual(0);
    expect(naturalCompare('a0a1', 'a0a9')).toEqual(-1);
    expect(naturalCompare('a0a9', 'a0a1')).toEqual(1);

    expect(naturalCompare('a10a11a', 'a10a11a')).toEqual(0);
    expect(naturalCompare('a10a11a', 'a10a19a')).toEqual(-1);
    expect(naturalCompare('a10a19a', 'a10a11a')).toEqual(1);

    expect(naturalCompare('a10a11a', 'a10a11a')).toEqual(0);
    expect(naturalCompare('a10a11a', 'a10a11b')).toEqual(-1);
    expect(naturalCompare('a10a11b', 'a10a11a')).toEqual(1);
  });
});
