import { expect } from 'chai';
import { parse } from 'graphql';
import extractExtensionDefinitons from '../generate/extractExtensionDefinitions';
import 'mocha';

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
    const extensionAst = extractExtensionDefinitons(astDocument);

    expect(extensionAst.definitions).to.have.length(1);
    expect(extensionAst.definitions[0].kind).to.equal('InputObjectTypeExtension');
  });
});

