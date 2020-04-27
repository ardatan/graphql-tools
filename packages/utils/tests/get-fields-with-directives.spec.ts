import { parse } from 'graphql';
import { getFieldsWithDirectives } from '../src';

describe('getFieldsWithDirectives', () => {
  it('Should detect single basic directive', () => {
    const node = parse(`
        type A {
            f1: String @a
        }
    `);

    const result = getFieldsWithDirectives(node);
    expect(result['A.f1']).toEqual([{ name: 'a', args: {} }]);
  });

  it('Should detect single basic directive in a type extension', () => {
    const node = parse(`
        extend type A {
          f1: String @a
        }
    `);

    const result = getFieldsWithDirectives(node);
    expect(result['A.f1']).toEqual([{ name: 'a', args: {} }]);
  });

  it('Should parse string argument correctly', () => {
    const node = parse(`
        type A {
            f1: String @a(f: "1")
        }
    `);

    const result = getFieldsWithDirectives(node);
    expect(result['A.f1']).toEqual([{ name: 'a', args: { f: '1' } }]);
  });

  it('Should parse multiple arguments correctly', () => {
    const node = parse(`
        type A {
            f1: String @a(a1: "1", a2: 10)
        }
    `);

    const result = getFieldsWithDirectives(node);
    expect(result['A.f1']).toEqual([{ name: 'a', args: { a1: '1', a2: 10 } }]);
  });

  it('Should parse object arg correctly', () => {
    const node = parse(`
        type A {
            f1: String @a(a1: { foo: "bar" })
        }
    `);

    const result = getFieldsWithDirectives(node);
    expect(result['A.f1']).toEqual([{ name: 'a', args: { a1: { foo: 'bar' } } }]);
  });

  it('Should parse array arg correctly', () => {
    const node = parse(`
        type A {
            f1: String @a(a1: [1,2,3])
        }
    `);

    const result = getFieldsWithDirectives(node);
    expect(result['A.f1']).toEqual([{ name: 'a', args: { a1: [1, 2, 3] } }]);
  });

  it('Should parse complex array arg correctly', () => {
    const node = parse(`
        type A {
            f1: String @a(a1: ["a", 1, {c: 3, d: true }])
        }
    `);

    const result = getFieldsWithDirectives(node);
    expect(result['A.f1']).toEqual([{ name: 'a', args: { a1: ['a', 1, { c: 3, d: true }] } }]);
  });

  it('Should detect multiple directives', () => {
    const node = parse(`
        type A {
            f1: String @a @b
        }
    `);

    const result = getFieldsWithDirectives(node);
    expect(result['A.f1']).toEqual([{ name: 'a', args: {} }, { name: 'b', args: {} }]);
  });

  it('Should detect multiple directives and multiple fields', () => {
    const node = parse(`
        type A {
            f1: String @a @b
            f2: String @c
        }
    `);

    const result = getFieldsWithDirectives(node);
    expect(result['A.f1']).toEqual([{ name: 'a', args: {} }, { name: 'b', args: {} }]);
    expect(result['A.f2']).toEqual([{ name: 'c', args: {} }]);
  });

  it('Should detect multiple types', () => {
    const node = parse(`
        type A {
          f1: String @a
        }

        type B {
          f2: String @a
        }
    `);

    const result = getFieldsWithDirectives(node);
    expect(result['A.f1']).toEqual([{ name: 'a', args: {} }]);
    expect(result['B.f2']).toEqual([{ name: 'a', args: {} }]);
  });

  it('Should include only fields with directives', () => {
    const node = parse(`
        type A {
          f1: String @a
          f2: Int
          f3: String
        }

        type B {
          f4: ID!
          f2: String @a
        }
    `);

    const result = getFieldsWithDirectives(node);
    expect(Object.keys(result).length).toBe(2);
  });
});
