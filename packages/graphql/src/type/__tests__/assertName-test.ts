import { assertEnumValueName, assertName } from '../assertName.js';

describe('assertName', () => {
  it('passthrough valid name', () => {
    expect(assertName('_ValidName123')).toEqual('_ValidName123');
  });

  it('throws on empty strings', () => {
    expect(() => assertName('')).toThrow('Expected name to be a non-empty string.');
  });

  it('throws for names with invalid characters', () => {
    expect(() => assertName('>--()-->')).toThrow('Names must only contain [_a-zA-Z0-9] but ">--()-->" does not.');
  });

  it('throws for names starting with invalid characters', () => {
    expect(() => assertName('42MeaningsOfLife')).toThrow(
      'Names must start with [_a-zA-Z] but "42MeaningsOfLife" does not.'
    );
  });
});

describe('assertEnumValueName', () => {
  it('passthrough valid name', () => {
    expect(assertEnumValueName('_ValidName123')).toEqual('_ValidName123');
  });

  it('throws on empty strings', () => {
    expect(() => assertEnumValueName('')).toThrow('Expected name to be a non-empty string.');
  });

  it('throws for names with invalid characters', () => {
    expect(() => assertEnumValueName('>--()-->')).toThrow(
      'Names must only contain [_a-zA-Z0-9] but ">--()-->" does not.'
    );
  });

  it('throws for names starting with invalid characters', () => {
    expect(() => assertEnumValueName('42MeaningsOfLife')).toThrow(
      'Names must start with [_a-zA-Z] but "42MeaningsOfLife" does not.'
    );
  });

  it('throws for restricted names', () => {
    expect(() => assertEnumValueName('true')).toThrow('Enum values cannot be named: true');
    expect(() => assertEnumValueName('false')).toThrow('Enum values cannot be named: false');
    expect(() => assertEnumValueName('null')).toThrow('Enum values cannot be named: null');
  });
});
