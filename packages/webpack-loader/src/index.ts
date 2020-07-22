import os from 'os';
import { isExecutableDefinitionNode, visit, Kind, DocumentNode } from 'graphql';
import { uniqueCode } from '@graphql-tools/webpack-loader-runtime';
import { parseDocument } from './parser';

function isSDL(doc: DocumentNode) {
  return !doc.definitions.some(def => isExecutableDefinitionNode(def));
}

function removeDescriptions(doc: DocumentNode) {
  function transformNode(node: any) {
    if (node.description) {
      node.description = undefined;
    }

    return node;
  }

  if (isSDL(doc)) {
    return visit(doc, {
      ScalarTypeDefinition: transformNode,
      ObjectTypeDefinition: transformNode,
      InterfaceTypeDefinition: transformNode,
      UnionTypeDefinition: transformNode,
      EnumTypeDefinition: transformNode,
      EnumValueDefinition: transformNode,
      InputObjectTypeDefinition: transformNode,
      InputValueDefinition: transformNode,
      FieldDefinition: transformNode,
    });
  }

  return doc;
}

interface Options {
  noDescription?: boolean;
  esModule?: boolean;
  importHelpers?: boolean;
}

function expandImports(source: string, options: Options) {
  const lines = source.split(/\r\n|\r|\n/);
  let outputCode = options.importHelpers
    ? `
    const { useUnique } = require('@graphql-tools/webpack-loader-runtime');

    const unique = useUnique();
  `
    : `
    ${uniqueCode}
  `;

  lines.some(line => {
    if (line[0] === '#' && line.slice(1).split(' ')[0] === 'import') {
      const importFile = line.slice(1).split(' ')[1];
      const parseDocument = `require(${importFile})`;
      const appendDef = `doc.definitions = doc.definitions.concat(unique(${parseDocument}.definitions));`;
      outputCode += appendDef + os.EOL;
    }
    return line.length !== 0 && line[0] !== '#';
  });

  return outputCode;
}

export default function graphqlLoader(source: string) {
  this.cacheable();
  const options: Options = this.query || {};
  let doc = parseDocument(source);

  // Removes descriptions from Nodes
  if (options.noDescription) {
    doc = removeDescriptions(doc);
  }

  const headerCode = `
    const doc = ${JSON.stringify(doc)};
  `;

  let outputCode = '';

  // Allow multiple query/mutation definitions in a file. This parses out dependencies
  // at compile time, and then uses those at load time to create minimal query documents
  // We cannot do the latter at compile time due to how the #import code works.
  const operationCount = doc.definitions.reduce<number>((accum, op) => {
    if (op.kind === Kind.OPERATION_DEFINITION) {
      return accum + 1;
    }

    return accum;
  }, 0);

  function exportDefaultStatement(identifier: string) {
    if (options.esModule) {
      return `export default ${identifier}`;
    }

    return `module.exports = ${identifier}`;
  }

  if (operationCount > 1) {
    throw new Error('GraphQL Webpack Loader allows only for one GraphQL Operation per file');
  }

  outputCode += `
    ${exportDefaultStatement('doc')}
  `;

  const importOutputCode = expandImports(source, options);
  const allCode = [headerCode, importOutputCode, outputCode, ''].join(os.EOL);

  return allCode;
}
