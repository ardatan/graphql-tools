import { expect } from 'chai';
import { parse } from 'graphql';

import { extractExtensionDefinitions } from '../generate/extensionDefinitions';

describe('Extension extraction', () => {
  it('extracts extended inputs', () => {
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

    expect(extensionAst.definitions).to.have.length(1);
    expect(extensionAst.definitions[0].kind).to.equal(
      'InputObjectTypeExtension',
    );
  });

  it('extracts extended unions', () => {
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

    expect(extensionAst.definitions).to.have.length(1);
    expect(extensionAst.definitions[0].kind).to.equal('UnionTypeExtension');
  });

  it('extracts extended enums', () => {
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

    expect(extensionAst.definitions).to.have.length(1);
    expect(extensionAst.definitions[0].kind).to.equal('EnumTypeExtension');
  });
});
