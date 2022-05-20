import {
  DefinitionNode,
  Source,
  parse,
  Kind,
  OperationDefinitionNode,
  DirectiveNode,
  SelectionNode,
  FieldNode,
  FragmentSpreadNode,
  InlineFragmentNode,
  FragmentDefinitionNode,
  ObjectTypeDefinitionNode,
  FieldDefinitionNode,
  ListTypeNode,
  TypeNode,
  NonNullTypeNode,
  NamedTypeNode,
  InputValueDefinitionNode,
  InterfaceTypeDefinitionNode,
  UnionTypeDefinitionNode,
  EnumTypeDefinitionNode,
  InputObjectTypeExtensionNode,
  InputObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
  InterfaceTypeExtensionNode,
  UnionTypeExtensionNode,
  EnumTypeExtensionNode,
  DirectiveDefinitionNode,
  SchemaDefinitionNode,
  OperationTypeDefinitionNode,
  DocumentNode,
  ScalarTypeDefinitionNode,
  ScalarTypeExtensionNode,
  print,
} from 'graphql';
import { readFileSync, realpathSync } from 'fs';
import { dirname, join, isAbsolute } from 'path';
import resolveFrom from 'resolve-from';
import { cwd as cwdFactory } from 'process';
import { parseGraphQLSDL } from '@graphql-tools/utils';

const builtinTypes = ['String', 'Float', 'Int', 'Boolean', 'ID', 'Upload'];

const builtinDirectives = [
  'deprecated',
  'skip',
  'include',
  'cacheControl',
  'key',
  'external',
  'requires',
  'provides',
  'connection',
  'client',
  'specifiedBy',
];

const IMPORT_FROM_REGEX = /^import\s+(\*|(.*))\s+from\s+('|")(.*)('|");?$/;
const IMPORT_DEFAULT_REGEX = /^import\s+('|")(.*)('|");?$/;

export type VisitedFilesMap = Map<string, Map<string, Set<DefinitionNode>>>;

/**
 * Loads the GraphQL document and recursively resolves all the imports
 * and copies them into the final document.
 * processImport does not merge the typeDefs as designed ( https://github.com/ardatan/graphql-tools/issues/2980#issuecomment-1003692728 )
 */
export function processImport(
  filePath: string,
  cwd = cwdFactory(),
  predefinedImports: Record<string, string> = {},
  visitedFiles: VisitedFilesMap = new Map()
): DocumentNode {
  const set = visitFile(filePath, join(cwd + '/root.graphql'), visitedFiles, predefinedImports);
  const definitionStrSet = new Set<string>();
  let definitionsStr = '';
  for (const defs of set.values()) {
    for (const def of defs) {
      const defStr = print(def);
      if (!definitionStrSet.has(defStr)) {
        definitionStrSet.add(defStr);
        definitionsStr += defStr + '\n';
      }
    }
  }

  return definitionsStr?.length
    ? parse(new Source(definitionsStr, filePath))
    : {
        kind: Kind.DOCUMENT,
        definitions: [],
      };
}

function visitFile(
  filePath: string,
  cwd: string,
  visitedFiles: VisitedFilesMap,
  predefinedImports: Record<string, string>
): Map<string, Set<DefinitionNode>> {
  if (!isAbsolute(filePath) && !(filePath in predefinedImports)) {
    filePath = resolveFilePath(cwd, filePath);
  }
  if (!visitedFiles.has(filePath)) {
    const fileContent = filePath in predefinedImports ? predefinedImports[filePath] : readFileSync(filePath, 'utf8');

    const { importLines, otherLines } = extractImportLines(fileContent);

    const { definitionsByName, dependenciesByDefinitionName } = extractDependencies(filePath, otherLines);
    const fileDefinitionMap = getFileDefinitionMap(definitionsByName, dependenciesByDefinitionName);

    // To prevent circular dependency
    visitedFiles.set(filePath, fileDefinitionMap);

    const { allImportedDefinitionsMap, potentialTransitiveDefinitionsMap } = processImports(
      importLines,
      filePath,
      visitedFiles,
      predefinedImports
    );

    const addDefinition = (definition: DefinitionNode, definitionName: string, definitionSet: Set<DefinitionNode>) => {
      const fileDefinitionMap = visitedFiles.get(filePath);
      if (fileDefinitionMap && !definitionSet.has(definition)) {
        definitionSet.add(definition);

        // Call addDefinition recursively to add all dependent documents
        if ('name' in definition && definition.name) {
          const documentName = definition.name.value;
          const dependencyDefinitionForDocument = allImportedDefinitionsMap.get(documentName);
          dependencyDefinitionForDocument?.forEach(node => {
            if (node !== definition) {
              addDefinition(node, definitionName, definitionSet);
            }
          });
        }

        // Regenerate field exports if some fields are imported after visitor
        if ('fields' in definition && definition.fields) {
          for (const field of definition.fields) {
            const fieldName = field.name.value;
            const fieldDefinitionName = definition.name.value + '.' + fieldName;
            const allImportedDefinitions = allImportedDefinitionsMap.get(definitionName);
            allImportedDefinitions?.forEach(importedDefinition => {
              if (!fileDefinitionMap.has(fieldDefinitionName)) {
                fileDefinitionMap.set(fieldDefinitionName, new Set());
              }
              const definitionsWithDeps = fileDefinitionMap.get(fieldDefinitionName);
              if (definitionsWithDeps) {
                addDefinition(importedDefinition, fieldDefinitionName, definitionsWithDeps);
              }
            });
            const newDependencySet = new Set<string>();
            switch (field.kind) {
              case Kind.FIELD_DEFINITION:
                visitFieldDefinitionNode(field, newDependencySet, dependenciesByDefinitionName);
                break;
              case Kind.INPUT_VALUE_DEFINITION:
                visitInputValueDefinitionNode(field, newDependencySet, dependenciesByDefinitionName);
                break;
            }
            newDependencySet.forEach(dependencyName => {
              const definitionsInCurrentFile = fileDefinitionMap.get(dependencyName);
              definitionsInCurrentFile?.forEach(def => addDefinition(def, definitionName, definitionSet));
              const definitionsFromImports = allImportedDefinitionsMap.get(dependencyName);
              definitionsFromImports?.forEach(def => addDefinition(def, definitionName, definitionSet));
              const transitiveDependencies = potentialTransitiveDefinitionsMap.get(dependencyName);
              transitiveDependencies?.forEach(def => addDefinition(def, definitionName, definitionSet));
            });
          }
        }
      }
    };

    if (!otherLines) {
      visitedFiles.set(filePath, allImportedDefinitionsMap);
    } else {
      const fileDefinitionMap = visitedFiles.get(filePath);
      if (fileDefinitionMap) {
        for (const [definitionName] of definitionsByName) {
          const definitionsWithDependencies = fileDefinitionMap.get(definitionName);
          if (definitionsWithDependencies) {
            const allImportedDefinitions = allImportedDefinitionsMap.get(definitionName);
            allImportedDefinitions?.forEach(importedDefinition => {
              addDefinition(importedDefinition, definitionName, definitionsWithDependencies);
            });
            const dependenciesOfDefinition = dependenciesByDefinitionName.get(definitionName);
            if (dependenciesOfDefinition) {
              for (const dependencyName of dependenciesOfDefinition) {
                // If that dependency cannot be found both in imports and this file, throw an error
                if (!allImportedDefinitionsMap.has(dependencyName) && !definitionsByName.has(dependencyName)) {
                  throw new Error(`Couldn't find type ${dependencyName} in any of the schemas.`);
                }
                const dependencyDefinitionsFromImports = allImportedDefinitionsMap.get(dependencyName);
                dependencyDefinitionsFromImports?.forEach(dependencyDefinition => {
                  // addDefinition will add recursively all dependent documents for dependencyName document
                  if (
                    'name' in dependencyDefinition &&
                    dependencyDefinition.name &&
                    dependencyDefinition.name.value === dependencyName
                  ) {
                    addDefinition(dependencyDefinition, definitionName, definitionsWithDependencies);
                  }
                });
              }
            }
          }
        }
      }
    }
  }
  return visitedFiles.get(filePath)!;
}

export function extractDependencies(
  filePath: string,
  fileContents: string
): {
  definitionsByName: Map<string, Set<DefinitionNode>>;
  dependenciesByDefinitionName: Map<string, Set<string>>;
} {
  const definitionsByName = new Map<string, Set<DefinitionNode>>();
  const dependenciesByDefinitionName = new Map<string, Set<string>>();

  const { document } = parseGraphQLSDL(filePath, fileContents, {
    noLocation: true,
  });

  for (const definition of document.definitions) {
    visitDefinition(definition, definitionsByName, dependenciesByDefinitionName);
  }

  return {
    definitionsByName,
    dependenciesByDefinitionName,
  };
}

function visitDefinition(
  definition: DefinitionNode,
  definitionsByName: Map<string, Set<DefinitionNode>>,
  dependenciesByDefinitionName: Map<string, Set<string>>
): void {
  // TODO: handle queries without names
  if ('name' in definition || definition.kind === Kind.SCHEMA_DEFINITION) {
    const definitionName = 'name' in definition && definition.name ? definition.name.value : 'schema';
    if (!definitionsByName.has(definitionName)) {
      definitionsByName.set(definitionName, new Set());
    }
    const definitionsSet = definitionsByName.get(definitionName)!;
    definitionsSet.add(definition);

    let dependencySet = dependenciesByDefinitionName.get(definitionName);
    if (!dependencySet) {
      dependencySet = new Set();
      dependenciesByDefinitionName.set(definitionName, dependencySet);
    }
    switch (definition.kind) {
      case Kind.OPERATION_DEFINITION:
        visitOperationDefinitionNode(definition, dependencySet);
        break;
      case Kind.FRAGMENT_DEFINITION:
        visitFragmentDefinitionNode(definition, dependencySet);
        break;
      case Kind.OBJECT_TYPE_DEFINITION:
        visitObjectTypeDefinitionNode(definition, dependencySet, dependenciesByDefinitionName);
        break;
      case Kind.INTERFACE_TYPE_DEFINITION:
        visitInterfaceTypeDefinitionNode(definition, dependencySet, dependenciesByDefinitionName);
        break;
      case Kind.UNION_TYPE_DEFINITION:
        visitUnionTypeDefinitionNode(definition, dependencySet);
        break;
      case Kind.ENUM_TYPE_DEFINITION:
        visitEnumTypeDefinitionNode(definition, dependencySet);
        break;
      case Kind.INPUT_OBJECT_TYPE_DEFINITION:
        visitInputObjectTypeDefinitionNode(definition, dependencySet, dependenciesByDefinitionName);
        break;
      case Kind.DIRECTIVE_DEFINITION:
        visitDirectiveDefinitionNode(definition, dependencySet, dependenciesByDefinitionName);
        break;
      case Kind.SCALAR_TYPE_DEFINITION:
        visitScalarDefinitionNode(definition, dependencySet);
        break;
      case Kind.SCHEMA_DEFINITION:
        visitSchemaDefinitionNode(definition, dependencySet);
        break;
      case Kind.OBJECT_TYPE_EXTENSION:
        visitObjectTypeExtensionNode(definition, dependencySet, dependenciesByDefinitionName);
        break;
      case Kind.INTERFACE_TYPE_EXTENSION:
        visitInterfaceTypeExtensionNode(definition, dependencySet, dependenciesByDefinitionName);
        break;
      case Kind.UNION_TYPE_EXTENSION:
        visitUnionTypeExtensionNode(definition, dependencySet);
        break;
      case Kind.ENUM_TYPE_EXTENSION:
        visitEnumTypeExtensionNode(definition, dependencySet);
        break;
      case Kind.INPUT_OBJECT_TYPE_EXTENSION:
        visitInputObjectTypeExtensionNode(definition, dependencySet, dependenciesByDefinitionName);
        break;
      case Kind.SCALAR_TYPE_EXTENSION:
        visitScalarExtensionNode(definition, dependencySet);
        break;
    }
    if ('fields' in definition && definition.fields) {
      for (const field of definition.fields) {
        const definitionName = definition.name.value + '.' + field.name.value;
        if (!definitionsByName.has(definitionName)) {
          definitionsByName.set(definitionName, new Set());
        }
        definitionsByName.get(definitionName)?.add({
          ...definition,
          fields: [field as any],
        });

        let dependencySet = dependenciesByDefinitionName.get(definitionName);
        if (!dependencySet) {
          dependencySet = new Set();
          dependenciesByDefinitionName.set(definitionName, dependencySet);
        }
        switch (field.kind) {
          case Kind.FIELD_DEFINITION:
            visitFieldDefinitionNode(field, dependencySet, dependenciesByDefinitionName);
            break;
          case Kind.INPUT_VALUE_DEFINITION:
            visitInputValueDefinitionNode(field, dependencySet, dependenciesByDefinitionName);
            break;
        }
      }
    }
  }
}

function getFileDefinitionMap(
  definitionsByName: Map<string, Set<DefinitionNode>>,
  dependenciesByDefinitionName: Map<string, Set<string>>
): Map<string, Set<DefinitionNode>> {
  const fileDefinitionMap = new Map<string, Set<DefinitionNode>>();

  for (const [definitionName, definitions] of definitionsByName) {
    let definitionsWithDependencies = fileDefinitionMap.get(definitionName);
    if (definitionsWithDependencies == null) {
      definitionsWithDependencies = new Set();
      fileDefinitionMap.set(definitionName, definitionsWithDependencies);
    }
    for (const definition of definitions) {
      definitionsWithDependencies.add(definition);
    }
    const dependenciesOfDefinition = dependenciesByDefinitionName.get(definitionName);
    if (dependenciesOfDefinition) {
      for (const dependencyName of dependenciesOfDefinition) {
        const dependencyDefinitions = definitionsByName.get(dependencyName);
        if (dependencyDefinitions != null) {
          for (const dependencyDefinition of dependencyDefinitions) {
            definitionsWithDependencies.add(dependencyDefinition);
          }
        }
      }
    }
  }

  return fileDefinitionMap;
}

export function processImports(
  importLines: string[],
  filePath: string,
  visitedFiles: VisitedFilesMap,
  predefinedImports: Record<string, string>
): {
  allImportedDefinitionsMap: Map<string, Set<DefinitionNode>>;
  potentialTransitiveDefinitionsMap: Map<string, Set<DefinitionNode>>;
} {
  const potentialTransitiveDefinitionsMap = new Map<string, Set<DefinitionNode>>();
  const allImportedDefinitionsMap = new Map<string, Set<DefinitionNode>>();
  for (const line of importLines) {
    const { imports, from } = parseImportLine(line.replace('#', '').trim());
    const importFileDefinitionMap = visitFile(from, filePath, visitedFiles, predefinedImports);

    const buildFullDefinitionMap = (dependenciesMap: Map<string, Set<DefinitionNode>>) => {
      for (const [importedDefinitionName, importedDefinitions] of importFileDefinitionMap) {
        const [importedDefinitionTypeName] = importedDefinitionName.split('.');
        if (!dependenciesMap.has(importedDefinitionTypeName)) {
          dependenciesMap.set(importedDefinitionTypeName, new Set());
        }
        const allImportedDefinitions = dependenciesMap.get(importedDefinitionTypeName);
        if (allImportedDefinitions) {
          for (const importedDefinition of importedDefinitions) {
            allImportedDefinitions.add(importedDefinition);
          }
        }
      }
    };

    buildFullDefinitionMap(potentialTransitiveDefinitionsMap);

    if (imports.includes('*')) {
      buildFullDefinitionMap(allImportedDefinitionsMap);
    } else {
      for (let importedDefinitionName of imports) {
        if (importedDefinitionName.endsWith('.*')) {
          // Adding whole type means the same thing with adding every single field
          importedDefinitionName = importedDefinitionName.replace('.*', '');
        }
        const [importedDefinitionTypeName] = importedDefinitionName.split('.');
        if (!allImportedDefinitionsMap.has(importedDefinitionTypeName)) {
          allImportedDefinitionsMap.set(importedDefinitionTypeName, new Set());
        }
        const allImportedDefinitions = allImportedDefinitionsMap.get(importedDefinitionTypeName);
        const importedDefinitions = importFileDefinitionMap.get(importedDefinitionName);
        if (!importedDefinitions) {
          throw new Error(`${importedDefinitionName} is not exported by ${from} imported by ${filePath}`);
        }
        if (allImportedDefinitions != null) {
          for (const importedDefinition of importedDefinitions) {
            allImportedDefinitions.add(importedDefinition);
          }
        }
      }
    }
  }
  return { allImportedDefinitionsMap, potentialTransitiveDefinitionsMap };
}

/**
 * Splits the contents of a GraphQL file into lines that are imports
 * and other lines which define the actual GraphQL document.
 */
export function extractImportLines(fileContent: string): { importLines: string[]; otherLines: string } {
  const importLines: string[] = [];
  let otherLines = '';
  for (const line of fileContent.split('\n')) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('#import ') || trimmedLine.startsWith('# import ')) {
      importLines.push(trimmedLine);
    } else if (trimmedLine) {
      otherLines += line + '\n';
    }
  }
  return { importLines, otherLines };
}

/**
 * Parses an import line, returning a list of entities imported and the file
 * from which they are imported.
 *
 * Throws if the import line does not have a correct format.
 */
export function parseImportLine(importLine: string): { imports: string[]; from: string } {
  let regexMatch = importLine.match(IMPORT_FROM_REGEX);
  if (regexMatch != null) {
    // Apply regex to import line
    // Extract matches into named variables
    const [, wildcard, importsString, , from] = regexMatch;

    if (from) {
      // Extract imported types
      const imports = wildcard === '*' ? ['*'] : importsString.split(',').map(d => d.trim());

      // Return information about the import line
      return { imports, from };
    }
  }

  regexMatch = importLine.match(IMPORT_DEFAULT_REGEX);
  if (regexMatch != null) {
    const [, , from] = regexMatch;
    if (from) {
      return { imports: ['*'], from };
    }
  }

  throw new Error(`
    Import statement is not valid:
    > ${importLine}
    If you want to have comments starting with '# import', please use ''' instead!
    You can only have 'import' statements in the following pattern;
    # import [Type].[Field] from [File]
  `);
}

function resolveFilePath(filePath: string, importFrom: string): string {
  const dirName = dirname(filePath);
  try {
    const fullPath = join(dirName, importFrom);
    return realpathSync(fullPath);
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      return resolveFrom(dirName, importFrom);
    }
    throw e;
  }
}

function visitOperationDefinitionNode(node: OperationDefinitionNode, dependencySet: Set<string>) {
  if (node.name?.value) {
    dependencySet.add(node.name.value);
  }
  node.selectionSet.selections.forEach(selectionNode => visitSelectionNode(selectionNode, dependencySet));
}

function visitSelectionNode(node: SelectionNode, dependencySet: Set<string>) {
  switch (node.kind) {
    case Kind.FIELD:
      visitFieldNode(node, dependencySet);
      break;
    case Kind.FRAGMENT_SPREAD:
      visitFragmentSpreadNode(node, dependencySet);
      break;
    case Kind.INLINE_FRAGMENT:
      visitInlineFragmentNode(node, dependencySet);
      break;
  }
}

function visitFieldNode(node: FieldNode, dependencySet: Set<string>) {
  node.selectionSet?.selections.forEach(selectionNode => visitSelectionNode(selectionNode, dependencySet));
}

function visitFragmentSpreadNode(node: FragmentSpreadNode, dependencySet: Set<string>) {
  dependencySet.add(node.name.value);
}

function visitInlineFragmentNode(node: InlineFragmentNode, dependencySet: Set<string>) {
  node.selectionSet.selections.forEach(selectionNode => visitSelectionNode(selectionNode, dependencySet));
}

function visitFragmentDefinitionNode(node: FragmentDefinitionNode, dependencySet: Set<string>) {
  dependencySet.add(node.name.value);
  node.selectionSet.selections.forEach(selectionNode => visitSelectionNode(selectionNode, dependencySet));
}

function addInterfaceDependencies(
  node: any,
  dependencySet: Set<string>,
  dependenciesByDefinitionName: Map<string, Set<string>>
) {
  const typeName: string = node.name.value;
  // all interfaces should be dependent to each other
  const allDependencies = [
    typeName,
    ...((node as any).interfaces?.map((namedTypeNode: NamedTypeNode) => namedTypeNode.name.value) || []),
  ];
  (node as any).interfaces?.forEach((namedTypeNode: NamedTypeNode) => {
    visitNamedTypeNode(namedTypeNode, dependencySet);
    const interfaceName = namedTypeNode.name.value;
    let set = dependenciesByDefinitionName.get(interfaceName);
    // interface should be dependent to the type as well
    if (set == null) {
      set = new Set();
      dependenciesByDefinitionName.set(interfaceName, set);
    }
    allDependencies.forEach(dependency => {
      if (dependency !== interfaceName) {
        set!.add(dependency);
      }
    });
  });
}

function visitObjectTypeDefinitionNode(
  node: ObjectTypeDefinitionNode,
  dependencySet: Set<string>,
  dependenciesByDefinitionName: Map<string, Set<string>>
) {
  const typeName = node.name.value;
  dependencySet.add(typeName);
  node.directives?.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  node.fields?.forEach(fieldDefinitionNode =>
    visitFieldDefinitionNode(fieldDefinitionNode, dependencySet, dependenciesByDefinitionName)
  );
  addInterfaceDependencies(node, dependencySet, dependenciesByDefinitionName);
}

function visitDirectiveNode(node: DirectiveNode, dependencySet: Set<string>) {
  const directiveName = node.name.value;
  if (!builtinDirectives.includes(directiveName)) {
    dependencySet.add(node.name.value);
  }
}

function visitFieldDefinitionNode(
  node: FieldDefinitionNode,
  dependencySet: Set<string>,
  dependenciesByDefinitionName: Map<string, Set<string>>
) {
  node.arguments?.forEach(inputValueDefinitionNode =>
    visitInputValueDefinitionNode(inputValueDefinitionNode, dependencySet, dependenciesByDefinitionName)
  );
  node.directives?.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  visitTypeNode(node.type, dependencySet, dependenciesByDefinitionName);
}

function visitTypeNode(
  node: TypeNode,
  dependencySet: Set<string>,
  dependenciesByDefinitionName: Map<string, Set<string>>
) {
  switch (node.kind) {
    case Kind.LIST_TYPE:
      visitListTypeNode(node, dependencySet, dependenciesByDefinitionName);
      break;
    case Kind.NON_NULL_TYPE:
      visitNonNullTypeNode(node, dependencySet, dependenciesByDefinitionName);
      break;
    case Kind.NAMED_TYPE:
      visitNamedTypeNode(node, dependencySet);
      break;
  }
}

function visitListTypeNode(
  node: ListTypeNode,
  dependencySet: Set<string>,
  dependenciesByDefinitionName: Map<string, Set<string>>
) {
  visitTypeNode(node.type, dependencySet, dependenciesByDefinitionName);
}

function visitNonNullTypeNode(
  node: NonNullTypeNode,
  dependencySet: Set<string>,
  dependenciesByDefinitionName: Map<string, Set<string>>
) {
  visitTypeNode(node.type, dependencySet, dependenciesByDefinitionName);
}

function visitNamedTypeNode(node: NamedTypeNode, dependencySet: Set<string>) {
  const namedTypeName = node.name.value;
  if (!builtinTypes.includes(namedTypeName)) {
    dependencySet.add(node.name.value);
  }
}

function visitInputValueDefinitionNode(
  node: InputValueDefinitionNode,
  dependencySet: Set<string>,
  dependenciesByDefinitionName: Map<string, Set<string>>
) {
  node.directives?.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  visitTypeNode(node.type, dependencySet, dependenciesByDefinitionName);
}

function visitInterfaceTypeDefinitionNode(
  node: InterfaceTypeDefinitionNode,
  dependencySet: Set<string>,
  dependenciesByDefinitionName: Map<string, Set<string>>
) {
  const typeName = node.name.value;
  dependencySet.add(typeName);
  node.directives?.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  node.fields?.forEach(fieldDefinitionNode =>
    visitFieldDefinitionNode(fieldDefinitionNode, dependencySet, dependenciesByDefinitionName)
  );
  addInterfaceDependencies(node, dependencySet, dependenciesByDefinitionName);
}

function visitUnionTypeDefinitionNode(node: UnionTypeDefinitionNode, dependencySet: Set<string>) {
  dependencySet.add(node.name.value);
  node.directives?.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  node.types?.forEach(namedTypeNode => visitNamedTypeNode(namedTypeNode, dependencySet));
}

function visitEnumTypeDefinitionNode(node: EnumTypeDefinitionNode, dependencySet: Set<string>) {
  dependencySet.add(node.name.value);
  node.directives?.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
}

function visitInputObjectTypeDefinitionNode(
  node: InputObjectTypeDefinitionNode,
  dependencySet: Set<string>,
  dependenciesByDefinitionName: Map<string, Set<string>>
) {
  dependencySet.add(node.name.value);
  node.directives?.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  node.fields?.forEach(inputValueDefinitionNode =>
    visitInputValueDefinitionNode(inputValueDefinitionNode, dependencySet, dependenciesByDefinitionName)
  );
}

function visitDirectiveDefinitionNode(
  node: DirectiveDefinitionNode,
  dependencySet: Set<string>,
  dependenciesByDefinitionName: Map<string, Set<string>>
) {
  dependencySet.add(node.name.value);
  node.arguments?.forEach(inputValueDefinitionNode =>
    visitInputValueDefinitionNode(inputValueDefinitionNode, dependencySet, dependenciesByDefinitionName)
  );
}

function visitObjectTypeExtensionNode(
  node: ObjectTypeExtensionNode,
  dependencySet: Set<string>,
  dependenciesByDefinitionName: Map<string, Set<string>>
) {
  const typeName = node.name.value;
  dependencySet.add(typeName);
  node.directives?.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  node.fields?.forEach(fieldDefinitionNode =>
    visitFieldDefinitionNode(fieldDefinitionNode, dependencySet, dependenciesByDefinitionName)
  );
  addInterfaceDependencies(node, dependencySet, dependenciesByDefinitionName);
}

function visitInterfaceTypeExtensionNode(
  node: InterfaceTypeExtensionNode,
  dependencySet: Set<string>,
  dependenciesByDefinitionName: Map<string, Set<string>>
) {
  const typeName = node.name.value;
  dependencySet.add(typeName);
  node.directives?.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  node.fields?.forEach(fieldDefinitionNode =>
    visitFieldDefinitionNode(fieldDefinitionNode, dependencySet, dependenciesByDefinitionName)
  );
  addInterfaceDependencies(node, dependencySet, dependenciesByDefinitionName);
}

function visitUnionTypeExtensionNode(node: UnionTypeExtensionNode, dependencySet: Set<string>) {
  dependencySet.add(node.name.value);
  node.directives?.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  node.types?.forEach(namedTypeNode => visitNamedTypeNode(namedTypeNode, dependencySet));
}

function visitEnumTypeExtensionNode(node: EnumTypeExtensionNode, dependencySet: Set<string>) {
  dependencySet.add(node.name.value);
  node.directives?.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
}

function visitInputObjectTypeExtensionNode(
  node: InputObjectTypeExtensionNode,
  dependencySet: Set<string>,
  dependenciesByDefinitionName: Map<string, Set<string>>
) {
  dependencySet.add(node.name.value);
  node.directives?.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  node.fields?.forEach(inputValueDefinitionNode =>
    visitInputValueDefinitionNode(inputValueDefinitionNode, dependencySet, dependenciesByDefinitionName)
  );
}

function visitSchemaDefinitionNode(node: SchemaDefinitionNode, dependencySet: Set<string>) {
  dependencySet.add('schema');
  node.directives?.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  node.operationTypes.forEach(operationTypeDefinitionNode =>
    visitOperationTypeDefinitionNode(operationTypeDefinitionNode, dependencySet)
  );
}

function visitScalarDefinitionNode(node: ScalarTypeDefinitionNode, dependencySet: Set<string>) {
  dependencySet.add(node.name.value);
  node.directives?.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
}

function visitScalarExtensionNode(node: ScalarTypeExtensionNode, dependencySet: Set<string>) {
  dependencySet.add(node.name.value);
  node.directives?.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
}

function visitOperationTypeDefinitionNode(node: OperationTypeDefinitionNode, dependencySet: Set<string>) {
  visitNamedTypeNode(node.type, dependencySet);
}
