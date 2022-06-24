import { DocumentNode, parse, print, visit } from 'graphql';
import { removeEmptyNodes } from '../src/index.js';

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
    const stringOut = JSON.stringify(normalizeAcrossGraphQLVersions(out));
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
    const stringOut = JSON.stringify(normalizeAcrossGraphQLVersions(out));
    expect(stringOut).toMatchSnapshot();
    expect(stringOut).not.toContain(`"arguments":[]`);
    expect(stringOut).not.toContain(`"directives":[]`);
    expect(() => print(out)).not.toThrow();
  });
});

function normalizeAcrossGraphQLVersions(doc: DocumentNode) {
  // This is needed to make tests work correctly across different versions of GraphQL
  // (it doesn't affect production logic)
  //
  // Some context: GraphQL 14 doesn't have "interfaces" prop for "InterfaceTypeDefinition" node
  //  So the produced AST is different from GraphQL 15+ which leads to snapshot mismatches.
  //  But we don't care about "interfaces" prop here
  const clearInterfacesProp = (node: any) => {
    delete node['interfaces'];
  };
  return visit(doc, {
    InterfaceTypeExtension: clearInterfacesProp,
    InterfaceTypeDefinition: clearInterfacesProp,
  });
}
