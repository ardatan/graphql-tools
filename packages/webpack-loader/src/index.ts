import os from 'os';
import {
  DocumentNode,
  FragmentDefinitionNode,
  isExecutableDefinitionNode,
  Kind,
  OperationDefinitionNode,
} from 'graphql';
import type { LoaderContext } from 'webpack';
import {
  DocumentOptimizer,
  optimizeDocumentNode,
  removeDescriptions,
  removeEmptyNodes,
} from '@graphql-tools/optimize';
import { uniqueCode } from '@graphql-tools/webpack-loader-runtime';
import { parseDocument } from './parser.js';

const ESM_RESERVED_NAMES = new Set([
  'arguments',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'eval',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);

function isExportableName(name: string) {
  return /^[_A-Za-z][_0-9A-Za-z]*$/.test(name) && !ESM_RESERVED_NAMES.has(name);
}

// Runs at load time so #import can append fragments before each named export is built.
const oneQueryCode = `
    function collectFragmentReferences(node, refs) {
      if (node.kind === "FragmentSpread") {
        refs.add(node.name.value);
      } else if (node.kind === "VariableDefinition") {
        var type = node.type;
        if (type.kind === "NamedType") {
          refs.add(type.name.value);
        }
      }

      if (node.selectionSet) {
        node.selectionSet.selections.forEach(function (selection) {
          collectFragmentReferences(selection, refs);
        });
      }

      if (node.variableDefinitions) {
        node.variableDefinitions.forEach(function (def) {
          collectFragmentReferences(def, refs);
        });
      }

      if (node.definitions) {
        node.definitions.forEach(function (def) {
          collectFragmentReferences(def, refs);
        });
      }
    }

    var definitionRefs = {};
    (function extractReferences() {
      doc.definitions.forEach(function (def) {
        if (def.name) {
          var refs = new Set();
          collectFragmentReferences(def, refs);
          definitionRefs[def.name.value] = refs;
        }
      });
    })();

    function findOperation(doc, name) {
      for (var i = 0; i < doc.definitions.length; i++) {
        var element = doc.definitions[i];
        if (element.name && element.name.value == name) {
          return element;
        }
      }
    }

    function oneQuery(doc, operationName) {
      var newDoc = {
        kind: doc.kind,
        definitions: [findOperation(doc, operationName)]
      };
      if (doc.hasOwnProperty("loc")) {
        newDoc.loc = doc.loc;
      }

      var opRefs = definitionRefs[operationName] || new Set();
      var allRefs = new Set();
      var newRefs = new Set();

      opRefs.forEach(function (refName) {
        newRefs.add(refName);
      });

      while (newRefs.size > 0) {
        var prevRefs = newRefs;
        newRefs = new Set();

        prevRefs.forEach(function (refName) {
          if (!allRefs.has(refName)) {
            allRefs.add(refName);
            var childRefs = definitionRefs[refName] || new Set();
            childRefs.forEach(function (childRef) {
              newRefs.add(childRef);
            });
          }
        });
      }

      allRefs.forEach(function (refName) {
        var op = findOperation(doc, refName);
        if (op) {
          newDoc.definitions.push(op);
        }
      });

      return newDoc;
    }
`;

function isSDL(doc: DocumentNode) {
  return !doc.definitions.some(def => isExecutableDefinitionNode(def));
}

interface Options {
  /**
   * Strip descriptions from SDL documents. Has no effect on operations or
   * fragments. Defaults to `false`.
   */
  noDescription?: boolean;
  /**
   * Strip empty `arguments`, `directives`, and `variableDefinitions` from SDL
   * documents. Has no effect on operations or fragments. Defaults to `false`.
   */
  noEmptyNodes?: boolean;
  /**
   * Accepted for compatibility. The loader always parses with `noLocation: true`.
   */
  noLoc?: boolean;
  /**
   * Replace `"kind": "Document"` strings in the emitted AST with `Kind.DOCUMENT`
   * references from `graphql/language/kinds`. Defaults to `false`.
   */
  replaceKinds?: boolean;
  /**
   * Emit `export default` instead of `module.exports`. `#import` then reads the
   * default export of the imported document. Defaults to `false`.
   */
  esModule?: boolean;
  /**
   * `require` `useUnique` from `@graphql-tools/webpack-loader-runtime` instead of
   * inlining the helper. Defaults to `false`.
   */
  importHelpers?: boolean;
}

function expandImports(source: string, options: Options) {
  const lines = source.split(/\r\n|\r|\n/);
  let outputCode = options.importHelpers
    ? `
    var useUnique = require('@graphql-tools/webpack-loader-runtime').useUnique;
    var unique = useUnique();
  `
    : `
    ${uniqueCode}
  `;

  lines.some(line => {
    if (line[0] === '#' && line.slice(1).split(' ')[0] === 'import') {
      const importFile = line.slice(1).split(' ')[1];
      const parseDocument = options.esModule
        ? `require(${importFile}).default`
        : `require(${importFile})`;
      const appendDef = `doc.definitions = doc.definitions.concat(unique(${parseDocument}.definitions));`;
      outputCode += appendDef + os.EOL;
    }
    return line.length !== 0 && line[0] !== '#';
  });

  return outputCode;
}

export default function graphqlLoader(this: LoaderContext<Options>, source: string) {
  this.cacheable();
  // TODO: This should probably use this.getOptions()
  const options = (this.query as Options) || {};
  let doc = parseDocument(source);

  const optimizers: DocumentOptimizer[] = [];

  if (options.noDescription) {
    optimizers.push(removeDescriptions);
  }
  if (options.noEmptyNodes) {
    optimizers.push(removeEmptyNodes);
  }

  if (optimizers.length > 0 && isSDL(doc)) {
    doc = optimizeDocumentNode(doc, optimizers);
  }

  let stringifiedDoc = JSON.stringify(doc);

  if (options.replaceKinds) {
    for (const identifier in Kind) {
      const value = Kind[identifier as keyof typeof Kind];
      stringifiedDoc = stringifiedDoc.replace(
        new RegExp(`"kind":"${value}"`, 'g'),
        `"kind": Kind.${identifier}`,
      );
    }
  }

  const headerCode = `
    ${options.replaceKinds ? "var Kind = require('graphql/language/kinds');" : ''}
    var doc = ${stringifiedDoc};
  `;

  let outputCode = '';

  // Named exports are built at load time so #import can append fragments first.
  const operations = doc.definitions.filter(
    (def): def is OperationDefinitionNode => def.kind === Kind.OPERATION_DEFINITION,
  );
  const namedDefinitions = doc.definitions.filter(
    (def): def is OperationDefinitionNode | FragmentDefinitionNode =>
      (def.kind === Kind.OPERATION_DEFINITION || def.kind === Kind.FRAGMENT_DEFINITION) &&
      def.name != null,
  );

  if (operations.length > 1 && operations.some(op => op.name == null)) {
    throw new Error(
      'GraphQL operation names are required when a file contains multiple operations',
    );
  }

  function exportDefaultStatement(identifier: string) {
    if (options.esModule) {
      return `export default ${identifier}`;
    }

    return `module.exports = ${identifier}`;
  }

  outputCode += `
    ${exportDefaultStatement('doc')}
  `;

  if (namedDefinitions.length > 0) {
    outputCode += oneQueryCode;
    for (const def of namedDefinitions) {
      const opName = def.name.value;
      if (options.esModule) {
        if (isExportableName(opName)) {
          outputCode += `
    export var ${opName} = oneQuery(doc, ${JSON.stringify(opName)});
`;
        }
      } else {
        outputCode += `
    module.exports[${JSON.stringify(opName)}] = oneQuery(doc, ${JSON.stringify(opName)});
`;
      }
    }
  }

  const importOutputCode = expandImports(source, options);
  const allCode = [headerCode, importOutputCode, outputCode, ''].join(os.EOL);

  return allCode;
}
