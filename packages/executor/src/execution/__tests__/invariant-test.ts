import { invariant } from '../invariant.js';

describe('invariant', () => {
  it('throws on false conditions', () => {
    expect(() => invariant(false, 'Oops!')).toThrow('Oops!');
  });

  it('use default error message', () => {
    expect(() => invariant(false)).toThrow('Unexpected invariant triggered.');
  });
});
