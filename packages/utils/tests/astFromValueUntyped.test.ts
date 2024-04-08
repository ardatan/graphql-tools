import { Kind, valueFromASTUntyped } from 'graphql';
import { astFromValueUntyped } from '../src/astFromValueUntyped.js';

describe('astFromValueUntyped', () => {
  it('supports Date', () => {
    const date = new Date();
    const ast = astFromValueUntyped(date);
    expect(ast).toEqual({
      kind: Kind.STRING,
      value: date.toISOString(),
    });
  });
  it('supports Buffer', () => {
    const buffer = Buffer.from('test');
    const ast = astFromValueUntyped(buffer);
    const generatedValue = valueFromASTUntyped(ast!);
    expect(generatedValue).toMatchObject(buffer.toJSON());
  });
});
