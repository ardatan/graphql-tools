import { parse } from 'graphql';

import { extractExtensionDefinitions } from '../generate/definitions';

describe('Extension extraction', () => {
  test('extracts extended inputs', () => {
    const typeDefs = `
      input Input {
        foo: String
      }

      extend input Input {
        bar: String
      }
    `;

    const astDocument = parse(typeDefs);
    const extensionAst = extractExtensionDefinitions(astDocument);

    expect(extensionAst.definitions).toHaveLength(1);
    expect(extensionAst.definitions[0].kind).toBe('InputObjectTypeExtension');
  });

  test('extracts extended unions', () => {
    const typeDefs = `
      type Person {
        name: String!
      }
      type Location {
        name: String!
      }
      union Searchable = Person | Location

      type Post {
        name: String!
      }
      extend union Searchable = Post
    `;

    const astDocument = parse(typeDefs);
    const extensionAst = extractExtensionDefinitions(astDocument);

    expect(extensionAst.definitions).toHaveLength(1);
    expect(extensionAst.definitions[0].kind).toBe('UnionTypeExtension');
  });

  test('extracts extended enums', () => {
    const typeDefs = `
      enum Color {
        RED
        GREEN
      }

      extend enum Color {
        BLUE
      }
    `;

    const astDocument = parse(typeDefs);
    const extensionAst = extractExtensionDefinitions(astDocument);

    expect(extensionAst.definitions).toHaveLength(1);
    expect(extensionAst.definitions[0].kind).toBe('EnumTypeExtension');
  });
});
