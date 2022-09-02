import { parse } from 'graphql';
import { getArgumentsWithDirectives } from '../src/index.js';

describe('getArgumentsWithDirectives', () => {
  it('Should detect single basic directive', () => {
    const node = parse(/* GraphQL */ `
      type A {
        f1(anArg: String @a): Int
      }
    `);

    const result = getArgumentsWithDirectives(node);
    expect(result['A.f1']).toEqual({ anArg: [{ name: 'a', args: {} }] });
  });

  it('Should detect single basic directive in a type extension', () => {
    const node = parse(/* GraphQL */ `
      extend type A {
        f1(anArg: String @a): Int
      }
    `);

    const result = getArgumentsWithDirectives(node);
    expect(result['A.f1']).toEqual({ anArg: [{ name: 'a', args: {} }] });
  });

  it('Should parse string argument correctly', () => {
    const node = parse(/* GraphQL */ `
      type A {
        f1(anArg: String @a(f: "1")): Int
      }
    `);

    const result = getArgumentsWithDirectives(node);
    expect(result['A.f1']).toEqual({ anArg: [{ name: 'a', args: { f: '1' } }] });
  });

  it('Should parse multiple arguments correctly', () => {
    const node = parse(/* GraphQL */ `
      type A {
        f1(anArg: String @a(a1: "1", a2: 10)): Int
      }
    `);

    const result = getArgumentsWithDirectives(node);
    expect(result['A.f1']).toEqual({ anArg: [{ name: 'a', args: { a1: '1', a2: 10 } }] });
  });

  it('Should parse object arg correctly', () => {
    const node = parse(/* GraphQL */ `
      type A {
        f1(anArg: String @a(a1: { foo: "bar" })): Int
      }
    `);

    const result = getArgumentsWithDirectives(node);
    expect(result['A.f1']).toEqual({ anArg: [{ name: 'a', args: { a1: { foo: 'bar' } } }] });
  });

  it('Should parse array arg correctly', () => {
    const node = parse(/* GraphQL */ `
      type A {
        f1(anArg: String @a(a1: [1, 2, 3])): Int
      }
    `);

    const result = getArgumentsWithDirectives(node);
    expect(result['A.f1']).toEqual({ anArg: [{ name: 'a', args: { a1: [1, 2, 3] } }] });
  });

  it('Should parse complex array arg correctly', () => {
    const node = parse(/* GraphQL */ `
      type A {
        f1(anArg: String @a(a1: ["a", 1, { c: 3, d: true }])): Int
      }
    `);

    const result = getArgumentsWithDirectives(node);
    expect(result['A.f1']).toEqual({ anArg: [{ name: 'a', args: { a1: ['a', 1, { c: 3, d: true }] } }] });
  });

  it('Should detect multiple directives', () => {
    const node = parse(/* GraphQL */ `
      type A {
        f1(anArg: String @a @b): Int
      }
    `);

    const result = getArgumentsWithDirectives(node);
    expect(result['A.f1']).toEqual({
      anArg: [
        { name: 'a', args: {} },
        { name: 'b', args: {} },
      ],
    });
  });

  it('Should detect multiple directives and multiple arguments', () => {
    const node = parse(/* GraphQL */ `
      type A {
        f1(anArg: String @a @b, anotherArg: String @c): Int
      }
    `);

    const result = getArgumentsWithDirectives(node);
    expect(result['A.f1']).toEqual({
      anArg: [
        { name: 'a', args: {} },
        { name: 'b', args: {} },
      ],
      anotherArg: [{ name: 'c', args: {} }],
    });
  });

  it('Should detect multiple directives and multiple fields', () => {
    const node = parse(/* GraphQL */ `
      type A {
        f1(anArg: String @a @b): Int
        f2(anotherArg: String @c): Int
      }
    `);

    const result = getArgumentsWithDirectives(node);
    expect(result['A.f1']).toEqual({
      anArg: [
        { name: 'a', args: {} },
        { name: 'b', args: {} },
      ],
    });
    expect(result['A.f2']).toEqual({ anotherArg: [{ name: 'c', args: {} }] });
  });

  it('Should detect multiple types', () => {
    const node = parse(/* GraphQL */ `
      type A {
        f1(anArg: String @a): Int
      }

      type B {
        f2(anArg: String @a): Int
      }
    `);

    const result = getArgumentsWithDirectives(node);
    expect(result['A.f1']).toEqual({ anArg: [{ name: 'a', args: {} }] });
    expect(result['B.f2']).toEqual({ anArg: [{ name: 'a', args: {} }] });
  });

  it('Should include only fields with arguments with directives', () => {
    const node = parse(/* GraphQL */ `
      type A {
        f1: String @a
        f2(anArg: Int): Int
        f3(anArg: String @a): Int
      }
    `);

    const result = getArgumentsWithDirectives(node);
    expect(result['A.f3']).toBeDefined();
    expect(Object.keys(result).length).toBe(1);
  });
});
