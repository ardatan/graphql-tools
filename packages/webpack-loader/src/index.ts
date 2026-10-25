import os from 'os';
import path from 'path';
import {
  DocumentNode,
  FragmentDefinitionNode,
  isExecutableDefinitionNode,
  Kind,
  NameNode,
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

type NamedExecutableDefinition = (OperationDefinitionNode | FragmentDefinitionNode) & {
  name: NameNode;
};

function isNamedExecutableDefinition(
  def: DocumentNode['definitions'][number],
): def is NamedExecutableDefinition {
  return (
    (def.kind === Kind.OPERATION_DEFINITION || def.kind === Kind.FRAGMENT_DEFINITION) &&
    def.name != null
  );
}

const DOCUMENT_EXPORT_KEYS = new Set(['kind', 'definitions', 'loc']);

function isGraphQLName(name: string) {
  return /^[_A-Za-z][_0-9A-Za-z]*$/.test(name);
}

// $ prefixes cannot appear in GraphQL names, so these bindings cannot collide
// with operation or fragment exports.
const oneQueryCode = `
    function $gqlCollectFragmentReferences(node, refs) {
      if (node.kind === "FragmentSpread") {
        refs.add(node.name.value);
      }

      if (node.selectionSet) {
        node.selectionSet.selections.forEach(function (selection) {
          $gqlCollectFragmentReferences(selection, refs);
        });
      }

      if (node.variableDefinitions) {
        node.variableDefinitions.forEach(function (def) {
          $gqlCollectFragmentReferences(def, refs);
        });
      }

      if (node.definitions) {
        node.definitions.forEach(function (def) {
          $gqlCollectFragmentReferences(def, refs);
        });
      }
    }

    var $gqlDefinitionRefs = Object.create(null);
    (function $gqlExtractReferences() {
      doc.definitions.forEach(function (def) {
        if (def.name) {
          var refs = new Set();
          $gqlCollectFragmentReferences(def, refs);
          $gqlDefinitionRefs[def.name.value] = refs;
        }
      });
    })();

    function $gqlFindDefinition(doc, name) {
      for (var i = 0; i < doc.definitions.length; i++) {
        var element = doc.definitions[i];
        if (element.name && element.name.value == name) {
          return element;
        }
      }
    }

    function $gqlOneQuery(doc, operationName) {
      var newDoc = {
        kind: doc.kind,
        definitions: [$gqlFindDefinition(doc, operationName)]
      };
      if (doc.hasOwnProperty("loc")) {
        newDoc.loc = doc.loc;
      }

      var opRefs = $gqlDefinitionRefs[operationName] || new Set();
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
            var childRefs = $gqlDefinitionRefs[refName] || new Set();
            childRefs.forEach(function (childRef) {
              newRefs.add(childRef);
            });
          }
        });
      }

      allRefs.forEach(function (refName) {
        var op = $gqlFindDefinition(doc, refName);
        if (op) {
          newDoc.definitions.push(op);
        }
      });

      return newDoc;
    }

    function $gqlEachNamedDefinition(callback) {
      var seen = Object.create(null);
      doc.definitions.forEach(function (def) {
        if (
          (def.kind !== "OperationDefinition" && def.kind !== "FragmentDefinition") ||
          !def.name
        ) {
          return;
        }
        var opName = def.name.value;
        if (seen[opName] && seen[opName] !== def.kind) {
          throw new Error(
            'GraphQL operation and fragment both named "' +
              opName +
              '" cannot be exported from the same file'
          );
        }
        seen[opName] = def.kind;
        callback(opName);
      });
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

function parseImportPaths(source: string): string[] {
  const importPaths: string[] = [];
  const lines = source.split(/\r\n|\r|\n/);
  for (const line of lines) {
    if (line[0] === '#' && line.slice(1).split(' ')[0] === 'import') {
      const raw = line.slice(1).split(' ')[1];
      if (raw) {
        try {
          importPaths.push(JSON.parse(raw));
        } catch {
          importPaths.push(raw.replace(/^['"]|['"]$/g, ''));
        }
      }
    } else if (line.length !== 0 && line[0] !== '#') {
      break;
    }
  }
  return importPaths;
}

function loaderContextDir(loader: LoaderContext<Options>): string {
  if (loader.context) {
    return loader.context;
  }
  if (loader.resourcePath) {
    return path.dirname(loader.resourcePath);
  }
  return '';
}

function resolveImportWithWebpack(
  loader: LoaderContext<Options>,
  contextDir: string,
  importPath: string,
): Promise<string | undefined> {
  return new Promise(resolve => {
    loader.resolve(contextDir, importPath, (error, result) => {
      if (error || result == null) {
        resolve(undefined);
        return;
      }
      resolve(String(result));
    });
  });
}

function resolveImportPath(contextDir: string, importPath: string): string | undefined {
  if (!contextDir) {
    return undefined;
  }
  return path.resolve(contextDir, importPath);
}

function readResolvedSource(
  loader: LoaderContext<Options>,
  resolved: string,
  seenFiles: Set<string>,
): string | undefined {
  const fs = loader.fs as { readFileSync?: (filePath: string) => string | Buffer } | undefined;
  if (fs?.readFileSync == null) {
    return undefined;
  }
  if (seenFiles.has(resolved)) {
    return undefined;
  }
  seenFiles.add(resolved);
  try {
    loader.addDependency(resolved);
    const data = fs.readFileSync(resolved);
    return typeof data === 'string' ? data : data.toString('utf8');
  } catch {
    return undefined;
  }
}

async function collectImportedNamedDefinitions(
  source: string,
  loader: LoaderContext<Options>,
  contextDir: string,
  seenFiles: Set<string>,
): Promise<NamedExecutableDefinition[]> {
  const collected: NamedExecutableDefinition[] = [];
  for (const importPath of parseImportPaths(source)) {
    const resolved = await resolveImportWithWebpack(loader, contextDir, importPath);
    if (resolved == null) {
      continue;
    }
    const imported = readResolvedSource(loader, resolved, seenFiles);
    if (imported == null) {
      continue;
    }
    const importedDoc = parseDocument(imported);
    collected.push(...importedDoc.definitions.filter(isNamedExecutableDefinition));
    collected.push(
      ...(await collectImportedNamedDefinitions(
        imported,
        loader,
        path.dirname(resolved),
        seenFiles,
      )),
    );
  }
  return collected;
}

function collectImportedNamedDefinitionsSync(
  source: string,
  loader: LoaderContext<Options>,
  contextDir: string,
  seenFiles: Set<string>,
): NamedExecutableDefinition[] {
  const collected: NamedExecutableDefinition[] = [];
  for (const importPath of parseImportPaths(source)) {
    const resolved = resolveImportPath(contextDir, importPath);
    if (resolved == null) {
      continue;
    }
    const imported = readResolvedSource(loader, resolved, seenFiles);
    if (imported == null) {
      continue;
    }
    const importedDoc = parseDocument(imported);
    collected.push(...importedDoc.definitions.filter(isNamedExecutableDefinition));
    collected.push(
      ...collectImportedNamedDefinitionsSync(imported, loader, path.dirname(resolved), seenFiles),
    );
  }
  return collected;
}

function emitLoaderCode(
  source: string,
  options: Options,
  importedNamedDefinitions: NamedExecutableDefinition[],
): string {
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
  const namedDefinitions = [
    ...doc.definitions.filter(isNamedExecutableDefinition),
    ...importedNamedDefinitions,
  ];

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

  if (namedDefinitions.length === 0 || options.esModule) {
    outputCode += `
    ${exportDefaultStatement('doc')}
  `;
  }

  const hasImports = parseImportPaths(source).length > 0;
  if (namedDefinitions.length > 0 || (!options.esModule && hasImports)) {
    const seenNames = new Map<string, string>();
    for (const def of namedDefinitions) {
      const opName = def.name.value;
      const previousKind = seenNames.get(opName);
      if (previousKind && previousKind !== def.kind) {
        throw new Error(
          `GraphQL operation and fragment both named "${opName}" cannot be exported from the same file`,
        );
      }
      seenNames.set(opName, def.kind);

      if (!isGraphQLName(opName)) {
        throw new Error(
          `Cannot export GraphQL operation or fragment named ${JSON.stringify(opName)}`,
        );
      }
      if (options.esModule && opName === 'default') {
        throw new Error(
          'Cannot export a GraphQL operation or fragment named "default" because the loader already emits a default export',
        );
      }
      if (!options.esModule && DOCUMENT_EXPORT_KEYS.has(opName)) {
        throw new Error(
          `Cannot export GraphQL operation or fragment named "${opName}" because it would replace the default document`,
        );
      }
    }

    outputCode += oneQueryCode;
    if (!options.esModule) {
      outputCode += `
    var $gqlExports = { kind: doc.kind, definitions: doc.definitions };
    if (doc.hasOwnProperty("loc")) {
      $gqlExports.loc = doc.loc;
    }
    module.exports = $gqlExports;
    $gqlEachNamedDefinition(function (opName) {
      if (opName === "kind" || opName === "definitions" || opName === "loc") {
        throw new Error(
          'Cannot export GraphQL operation or fragment named "' +
            opName +
            '" because it would replace the default document'
        );
      }
      Object.defineProperty($gqlExports, opName, {
        value: $gqlOneQuery(doc, opName),
        enumerable: true,
        configurable: true,
        writable: true
      });
    });
`;
    }

    if (options.esModule) {
      const emitted = new Set<string>();
      namedDefinitions.forEach((def, index) => {
        const opName = def.name.value;
        if (emitted.has(opName)) {
          return;
        }
        emitted.add(opName);
        outputCode += `
    var $gql_exp_${index} = $gqlOneQuery(doc, ${JSON.stringify(opName)});
    export { $gql_exp_${index} as ${opName} };
`;
      });
    }
  }

  const importOutputCode = expandImports(source, options);
  const allCode = [headerCode, importOutputCode, outputCode, ''].join(os.EOL);

  return allCode;
}

export default function graphqlLoader(this: LoaderContext<Options>, source: string) {
  this.cacheable();
  // TODO: This should probably use this.getOptions()
  const options = (this.query as Options) || {};
  const contextDir = loaderContextDir(this);
  const needsImportedNames = parseImportPaths(source).length > 0;

  if (!needsImportedNames) {
    return emitLoaderCode(source, options, []);
  }

  if (typeof this.resolve === 'function') {
    const callback = typeof this.async === 'function' ? this.async() : undefined;
    const pending = collectImportedNamedDefinitions(source, this, contextDir, new Set()).then(
      imported => emitLoaderCode(source, options, imported),
    );
    if (callback) {
      pending.then(
        code => callback(null, code),
        error => callback(error),
      );
      return;
    }
    return pending;
  }

  return emitLoaderCode(
    source,
    options,
    collectImportedNamedDefinitionsSync(source, this, contextDir, new Set()),
  );
}
