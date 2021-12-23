import { parse, print } from 'graphql';
import { removeEmptyNodes } from '../src';

describe('removeEmptyNodes', () => {
  it('Should remove all empty notes from GraphQL operations', () => {
    const doc = parse(/* GraphQL */ `
      query findUser($userId: ID!) {
        user(id: $userId) {
          ...UserFields
        }
      }

      query something {
        test {
          test
        }
      }

      fragment UserFields on User {
        id
        username
        role
      }
    `);
    const out = removeEmptyNodes(doc);
    const stringOut = JSON.stringify(out);
    expect(stringOut).toMatchSnapshot();
    expect(stringOut).not.toContain(`"arguments":[]`);
    expect(stringOut).not.toContain(`"directives":[]`);
    expect(stringOut).not.toContain(`"variableDefinitions":[]`);
    expect(() => print(out)).not.toThrow();
  });

  it('Should remove all empty notes from GraphQL SDL definitions', () => {
    const doc = parse(/* GraphQL */ `
      schema {
        query: Foo
      }
      scalar Foo
      type Foo {
        bar: Bar
      }
      interface Foo {
        bar: Bar
      }
      union FooBar = Foo | Bar
      enum FooBar {
        FOO
        BAR
      }
      input Foo {
        bar: Bar
      }
      type Bar {
        bar(foo: Foo): Bar
      }
    `);
    const out = removeEmptyNodes(doc);
    const stringOut = JSON.stringify(out);
    expect(stringOut).toMatchSnapshot();
    expect(stringOut).not.toContain(`"arguments":[]`);
    expect(stringOut).not.toContain(`"directives":[]`);
    expect(() => print(out)).not.toThrow();
  });

  it('Should remove all empty notes from GraphQL SDL extensions', () => {
    const doc = parse(/* GraphQL */ `
      extend schema {
        query: Foo
      }
      extend scalar Foo @foo
      extend type Foo {
        bar: Bar
      }
      extend interface Foo {
        bar: Bar
      }
      extend union FooBar = Foo | Bar
      extend enum FooBar {
        FOO
        BAR
      }
      extend input Foo {
        bar: Bar
      }
    `);
    const out = removeEmptyNodes(doc);
    const stringOut = JSON.stringify(out);
    expect(stringOut).toMatchSnapshot();
    expect(stringOut).not.toContain(`"arguments":[]`);
    expect(stringOut).not.toContain(`"directives":[]`);
    expect(() => print(out)).not.toThrow();
  });
});
