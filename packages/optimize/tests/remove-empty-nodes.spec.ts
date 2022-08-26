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
    expect(stringOut).toMatchInlineSnapshot(
      `"{"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"findUser","loc":{"start":13,"end":21}},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId","loc":{"start":23,"end":29}},"loc":{"start":22,"end":29}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID","loc":{"start":31,"end":33}},"loc":{"start":31,"end":33}},"loc":{"start":31,"end":34}},"loc":{"start":22,"end":34}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user","loc":{"start":46,"end":50}},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id","loc":{"start":51,"end":53}},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId","loc":{"start":56,"end":62}},"loc":{"start":55,"end":62}},"loc":{"start":51,"end":62}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFields","loc":{"start":79,"end":89}},"loc":{"start":76,"end":89}}],"loc":{"start":64,"end":99}},"loc":{"start":46,"end":99}}],"loc":{"start":36,"end":107}},"loc":{"start":7,"end":107}},{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"something","loc":{"start":121,"end":130}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"test","loc":{"start":141,"end":145}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"test","loc":{"start":158,"end":162}},"loc":{"start":158,"end":162}}],"loc":{"start":146,"end":172}},"loc":{"start":141,"end":172}}],"loc":{"start":131,"end":180}},"loc":{"start":115,"end":180}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFields","loc":{"start":197,"end":207}},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User","loc":{"start":211,"end":215}},"loc":{"start":211,"end":215}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id","loc":{"start":226,"end":228}},"loc":{"start":226,"end":228}},{"kind":"Field","name":{"kind":"Name","value":"username","loc":{"start":237,"end":245}},"loc":{"start":237,"end":245}},{"kind":"Field","name":{"kind":"Name","value":"role","loc":{"start":254,"end":258}},"loc":{"start":254,"end":258}}],"loc":{"start":216,"end":266}},"loc":{"start":188,"end":266}}],"loc":{"start":0,"end":271}}"`
    );
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
    expect(stringOut).toMatchInlineSnapshot(
      `"{"kind":"Document","definitions":[{"kind":"SchemaDefinition","operationTypes":[{"kind":"OperationTypeDefinition","operation":"query","type":{"kind":"NamedType","name":{"kind":"Name","value":"Foo","loc":{"start":31,"end":34}},"loc":{"start":31,"end":34}},"loc":{"start":24,"end":34}}],"loc":{"start":7,"end":42}},{"kind":"ScalarTypeDefinition","name":{"kind":"Name","value":"Foo","loc":{"start":56,"end":59}},"loc":{"start":49,"end":59}},{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Foo","loc":{"start":71,"end":74}},"interfaces":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"bar","loc":{"start":85,"end":88}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Bar","loc":{"start":90,"end":93}},"loc":{"start":90,"end":93}},"loc":{"start":85,"end":93}}],"loc":{"start":66,"end":101}},{"kind":"InterfaceTypeDefinition","name":{"kind":"Name","value":"Foo","loc":{"start":118,"end":121}},"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"bar","loc":{"start":132,"end":135}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Bar","loc":{"start":137,"end":140}},"loc":{"start":137,"end":140}},"loc":{"start":132,"end":140}}],"loc":{"start":108,"end":148}},{"kind":"UnionTypeDefinition","name":{"kind":"Name","value":"FooBar","loc":{"start":161,"end":167}},"types":[{"kind":"NamedType","name":{"kind":"Name","value":"Foo","loc":{"start":170,"end":173}},"loc":{"start":170,"end":173}},{"kind":"NamedType","name":{"kind":"Name","value":"Bar","loc":{"start":176,"end":179}},"loc":{"start":176,"end":179}}],"loc":{"start":155,"end":179}},{"kind":"EnumTypeDefinition","name":{"kind":"Name","value":"FooBar","loc":{"start":191,"end":197}},"values":[{"kind":"EnumValueDefinition","name":{"kind":"Name","value":"FOO","loc":{"start":208,"end":211}},"loc":{"start":208,"end":211}},{"kind":"EnumValueDefinition","name":{"kind":"Name","value":"BAR","loc":{"start":220,"end":223}},"loc":{"start":220,"end":223}}],"loc":{"start":186,"end":231}},{"kind":"InputObjectTypeDefinition","name":{"kind":"Name","value":"Foo","loc":{"start":244,"end":247}},"fields":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"bar","loc":{"start":258,"end":261}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Bar","loc":{"start":263,"end":266}},"loc":{"start":263,"end":266}},"loc":{"start":258,"end":266}}],"loc":{"start":238,"end":274}},{"kind":"ObjectTypeDefinition","name":{"kind":"Name","value":"Bar","loc":{"start":286,"end":289}},"interfaces":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"bar","loc":{"start":300,"end":303}},"arguments":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"foo","loc":{"start":304,"end":307}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Foo","loc":{"start":309,"end":312}},"loc":{"start":309,"end":312}},"loc":{"start":304,"end":312}}],"type":{"kind":"NamedType","name":{"kind":"Name","value":"Bar","loc":{"start":315,"end":318}},"loc":{"start":315,"end":318}},"loc":{"start":300,"end":318}}],"loc":{"start":281,"end":326}}],"loc":{"start":0,"end":331}}"`
    );
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
    expect(stringOut).toMatchInlineSnapshot(
      `"{"kind":"Document","definitions":[{"kind":"SchemaExtension","operationTypes":[{"kind":"OperationTypeDefinition","operation":"query","type":{"kind":"NamedType","name":{"kind":"Name","value":"Foo","loc":{"start":38,"end":41}},"loc":{"start":38,"end":41}},"loc":{"start":31,"end":41}}],"loc":{"start":7,"end":49}},{"kind":"ScalarTypeExtension","name":{"kind":"Name","value":"Foo","loc":{"start":70,"end":73}},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"foo","loc":{"start":75,"end":78}},"loc":{"start":74,"end":78}}],"loc":{"start":56,"end":78}},{"kind":"ObjectTypeExtension","name":{"kind":"Name","value":"Foo","loc":{"start":97,"end":100}},"interfaces":[],"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"bar","loc":{"start":111,"end":114}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Bar","loc":{"start":116,"end":119}},"loc":{"start":116,"end":119}},"loc":{"start":111,"end":119}}],"loc":{"start":85,"end":127}},{"kind":"InterfaceTypeExtension","name":{"kind":"Name","value":"Foo","loc":{"start":151,"end":154}},"fields":[{"kind":"FieldDefinition","name":{"kind":"Name","value":"bar","loc":{"start":165,"end":168}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Bar","loc":{"start":170,"end":173}},"loc":{"start":170,"end":173}},"loc":{"start":165,"end":173}}],"loc":{"start":134,"end":181}},{"kind":"UnionTypeExtension","name":{"kind":"Name","value":"FooBar","loc":{"start":201,"end":207}},"types":[{"kind":"NamedType","name":{"kind":"Name","value":"Foo","loc":{"start":210,"end":213}},"loc":{"start":210,"end":213}},{"kind":"NamedType","name":{"kind":"Name","value":"Bar","loc":{"start":216,"end":219}},"loc":{"start":216,"end":219}}],"loc":{"start":188,"end":219}},{"kind":"EnumTypeExtension","name":{"kind":"Name","value":"FooBar","loc":{"start":238,"end":244}},"values":[{"kind":"EnumValueDefinition","name":{"kind":"Name","value":"FOO","loc":{"start":255,"end":258}},"loc":{"start":255,"end":258}},{"kind":"EnumValueDefinition","name":{"kind":"Name","value":"BAR","loc":{"start":267,"end":270}},"loc":{"start":267,"end":270}}],"loc":{"start":226,"end":278}},{"kind":"InputObjectTypeExtension","name":{"kind":"Name","value":"Foo","loc":{"start":298,"end":301}},"fields":[{"kind":"InputValueDefinition","name":{"kind":"Name","value":"bar","loc":{"start":312,"end":315}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Bar","loc":{"start":317,"end":320}},"loc":{"start":317,"end":320}},"loc":{"start":312,"end":320}}],"loc":{"start":285,"end":328}}],"loc":{"start":0,"end":333}}"`
    );
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
