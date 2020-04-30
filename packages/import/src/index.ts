/* eslint-disable no-unused-expressions */
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
} from 'graphql';
import { readFileSync, realpathSync } from 'fs-extra';
import { dirname, join, isAbsolute } from 'path';
import resolveFrom from 'resolve-from';

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
];

const IMPORT_FROM_REGEX = /^import\s+(\*|(.*))\s+from\s+('|")(.*)('|");?$/;
const IMPORT_DEFAULT_REGEX = /^import\s+('|")(.*)('|");?$/;

export function processImport(
  filePath: string,
  cwd = process.cwd(),
  predefinedImports: Record<string, string> = {}
): DocumentNode {
  const visitedFiles = new Map<string, Map<string, Set<DefinitionNode>>>();
  const set = visitFile(filePath, join(cwd + '/root.graphql'), visitedFiles, predefinedImports);
  const definitionSet = new Set<DefinitionNode>();
  for (const defs of set.values()) {
    for (const def of defs) {
      definitionSet.add(def);
    }
  }
  return {
    kind: Kind.DOCUMENT,
    definitions: [...definitionSet],
  };
}

function visitFile(
  filePath: string,
  cwd: string,
  visitedFiles: Map<string, Map<string, Set<DefinitionNode>>>,
  predefinedImports: Record<string, string>
) {
  if (!isAbsolute(filePath) && !(filePath in predefinedImports)) {
    filePath = resolveFilePath(cwd, filePath);
  }
  if (!visitedFiles.has(filePath)) {
    const fileDefinitionMap = new Map<string, Set<DefinitionNode>>();
    // To prevent circular dependency
    visitedFiles.set(filePath, fileDefinitionMap);
    const fileContent = filePath in predefinedImports ? predefinedImports[filePath] : readFileSync(filePath, 'utf8');
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
    const definitionsByName = new Map<string, Set<DefinitionNode>>();
    const dependenciesByDefinitionName = new Map<string, Set<string>>();
    if (otherLines) {
      const document = parse(new Source(otherLines, filePath));
      for (const definition of document.definitions) {
        if ('name' in definition || definition.kind === Kind.SCHEMA_DEFINITION) {
          const definitionName = 'name' in definition ? definition.name.value : 'schema';
          if (!definitionsByName.has(definitionName)) {
            definitionsByName.set(definitionName, new Set());
          }
          const definitionsSet = definitionsByName.get(definitionName);
          definitionsSet.add(definition);
          if (!dependenciesByDefinitionName.has(definitionName)) {
            dependenciesByDefinitionName.set(definitionName, new Set());
          }
          const dependencySet = dependenciesByDefinitionName.get(definitionName);
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
            case Kind.SCHEMA_DEFINITION:
              visitSchemaDefinitionNode(definition, dependencySet);
              break;
          }
          if ('fields' in definition) {
            for (const field of definition.fields) {
              const definitionName = definition.name.value + '.' + field.name.value;
              if (!definitionsByName.has(definitionName)) {
                definitionsByName.set(definitionName, new Set());
              }
              const definitionsSet = definitionsByName.get(definitionName);
              definitionsSet.add({
                ...definition,
                fields: [field as any],
              });
              if (!dependenciesByDefinitionName.has(definitionName)) {
                dependenciesByDefinitionName.set(definitionName, new Set());
              }
              const dependencySet = dependenciesByDefinitionName.get(definitionName);
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
    }
    const importedDefinitionsMap = new Map<string, Set<DefinitionNode>>();
    for (const line of importLines) {
      const { imports, from } = parseImportLine(line.replace('#', '').trim());
      const importFileDefinitionMap = visitFile(from, filePath, visitedFiles, predefinedImports);
      if (imports.includes('*')) {
        for (const [importedDefinitionName, importedDefinitions] of importFileDefinitionMap) {
          // Don't need to add field specific definitions
          if (!importedDefinitionName.includes('.')) {
            if (!importedDefinitionsMap.has(importedDefinitionName)) {
              importedDefinitionsMap.set(importedDefinitionName, new Set());
            }
            for (const importedDefinition of importedDefinitions) {
              importedDefinitionsMap.get(importedDefinitionName).add(importedDefinition);
            }
          }
        }
      } else {
        for (let importedDefinitionName of imports) {
          if (importedDefinitionName.endsWith('.*')) {
            // Adding whole type means the same thing with adding every single field
            importedDefinitionName = importedDefinitionName.replace('.*', '');
          }
          const importDefinitions = importFileDefinitionMap.get(importedDefinitionName);
          if (!definitionsByName.has(importedDefinitionName)) {
            definitionsByName.set(importedDefinitionName, new Set());
          }
          for (const importDefinition of importDefinitions) {
            definitionsByName.get(importedDefinitionName).add(importDefinition);
          }
          if (!dependenciesByDefinitionName.has(importedDefinitionName)) {
            dependenciesByDefinitionName.set(importedDefinitionName, new Set());
          }
        }
      }
    }
    for (const [definitionName, definitions] of definitionsByName) {
      if (!fileDefinitionMap.has(definitionName)) {
        const definitionsWithDependencies = new Set<DefinitionNode>();
        for (const definition of definitions) {
          definitionsWithDependencies.add(definition);
        }
        const dependenciesOfDefinition = dependenciesByDefinitionName.get(definitionName);
        for (const dependencyName of dependenciesOfDefinition) {
          const dependencyDefinitions = definitionsByName.get(dependencyName);
          const dependencyDefinitionsFromImports = importedDefinitionsMap.get(dependencyName);
          if (!dependencyDefinitions && !dependencyDefinitionsFromImports) {
            throw new Error(`Couldn't find type ${dependencyName} in any of the schemas.`);
          }
          dependencyDefinitions?.forEach(dependencyDefinition => {
            definitionsWithDependencies.add(dependencyDefinition);
          });
          dependencyDefinitionsFromImports?.forEach(dependencyDefinition => {
            definitionsWithDependencies.add(dependencyDefinition);
          });
        }
        fileDefinitionMap.set(definitionName, definitionsWithDependencies);
      }
    }
  }
  return visitedFiles.get(filePath);
}

export function parseImportLine(importLine: string): { imports: string[]; from: string } {
  if (IMPORT_FROM_REGEX.test(importLine)) {
    // Apply regex to import line
    // Extract matches into named variables
    const [, wildcard, importsString, , from] = importLine.match(IMPORT_FROM_REGEX);

    if (from) {
      // Extract imported types
      const imports = wildcard === '*' ? ['*'] : importsString.split(',').map(d => d.trim());

      // Return information about the import line
      return { imports, from };
    }
  } else if (IMPORT_DEFAULT_REGEX.test(importLine)) {
    const [, , from] = importLine.match(IMPORT_DEFAULT_REGEX);
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

function resolveFilePath(filePath: string, importFrom: string) {
  const dirName = dirname(filePath);
  try {
    const fullPath = join(dirName, importFrom);
    return realpathSync(fullPath);
  } catch (e) {
    if (e.code === 'ENOENT') {
      return resolveFrom(dirName, importFrom);
    }
  }
}

function visitOperationDefinitionNode(node: OperationDefinitionNode, dependencySet: Set<string>) {
  dependencySet.add(node.name.value);
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

function visitObjectTypeDefinitionNode(
  node: ObjectTypeDefinitionNode,
  dependencySet: Set<string>,
  dependenciesByDefinitionName: Map<string, Set<string>>
) {
  const typeName = node.name.value;
  dependencySet.add(typeName);
  node.directives.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  node.fields.forEach(fieldDefinitionNode =>
    visitFieldDefinitionNode(fieldDefinitionNode, dependencySet, dependenciesByDefinitionName)
  );
  node.interfaces.forEach(namedTypeNode => {
    visitNamedTypeNode(namedTypeNode, dependencySet);
    const interfaceName = namedTypeNode.name.value;
    // interface should be dependent to the type as well
    if (!dependenciesByDefinitionName.has(interfaceName)) {
      dependenciesByDefinitionName.set(interfaceName, new Set());
    }
    dependenciesByDefinitionName.get(interfaceName).add(typeName);
  });
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
  node.arguments.forEach(inputValueDefinitionNode =>
    visitInputValueDefinitionNode(inputValueDefinitionNode, dependencySet, dependenciesByDefinitionName)
  );
  node.directives.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
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
  node.directives.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  visitTypeNode(node.type, dependencySet, dependenciesByDefinitionName);
}

function visitInterfaceTypeDefinitionNode(
  node: InterfaceTypeDefinitionNode,
  dependencySet: Set<string>,
  dependenciesByDefinitionName: Map<string, Set<string>>
) {
  const typeName = node.name.value;
  dependencySet.add(typeName);
  node.directives.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  node.fields.forEach(fieldDefinitionNode =>
    visitFieldDefinitionNode(fieldDefinitionNode, dependencySet, dependenciesByDefinitionName)
  );
  (node as any).interfaces?.forEach((namedTypeNode: NamedTypeNode) => {
    visitNamedTypeNode(namedTypeNode, dependencySet);
    const interfaceName = namedTypeNode.name.value;
    // interface should be dependent to the type as well
    if (!dependenciesByDefinitionName.has(interfaceName)) {
      dependenciesByDefinitionName.set(interfaceName, new Set());
    }
    dependenciesByDefinitionName.get(interfaceName).add(typeName);
  });
}

function visitUnionTypeDefinitionNode(node: UnionTypeDefinitionNode, dependencySet: Set<string>) {
  dependencySet.add(node.name.value);
  node.directives.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  node.types.forEach(namedTypeNode => visitNamedTypeNode(namedTypeNode, dependencySet));
}

function visitEnumTypeDefinitionNode(node: EnumTypeDefinitionNode, dependencySet: Set<string>) {
  dependencySet.add(node.name.value);
  node.directives.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
}

function visitInputObjectTypeDefinitionNode(
  node: InputObjectTypeDefinitionNode,
  dependencySet: Set<string>,
  dependenciesByDefinitionName: Map<string, Set<string>>
) {
  dependencySet.add(node.name.value);
  node.directives.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  node.fields.forEach(inputValueDefinitionNode =>
    visitInputValueDefinitionNode(inputValueDefinitionNode, dependencySet, dependenciesByDefinitionName)
  );
}

function visitDirectiveDefinitionNode(
  node: DirectiveDefinitionNode,
  dependencySet: Set<string>,
  dependenciesByDefinitionName: Map<string, Set<string>>
) {
  dependencySet.add(node.name.value);
  node.arguments.forEach(inputValueDefinitionNode =>
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
  node.directives.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  node.fields.forEach(fieldDefinitionNode =>
    visitFieldDefinitionNode(fieldDefinitionNode, dependencySet, dependenciesByDefinitionName)
  );
  node.interfaces.forEach(namedTypeNode => {
    visitNamedTypeNode(namedTypeNode, dependencySet);
    const interfaceName = namedTypeNode.name.value;
    // interface should be dependent to the type as well
    if (!dependenciesByDefinitionName.has(interfaceName)) {
      dependenciesByDefinitionName.set(interfaceName, new Set());
    }
    dependenciesByDefinitionName.get(interfaceName).add(typeName);
  });
}

function visitInterfaceTypeExtensionNode(
  node: InterfaceTypeExtensionNode,
  dependencySet: Set<string>,
  dependenciesByDefinitionName: Map<string, Set<string>>
) {
  const typeName = node.name.value;
  dependencySet.add(typeName);
  node.directives.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  node.fields.forEach(fieldDefinitionNode =>
    visitFieldDefinitionNode(fieldDefinitionNode, dependencySet, dependenciesByDefinitionName)
  );
  (node as any).interfaces?.forEach((namedTypeNode: NamedTypeNode) => {
    visitNamedTypeNode(namedTypeNode, dependencySet);
    const interfaceName = namedTypeNode.name.value;
    // interface should be dependent to the type as well
    if (!dependenciesByDefinitionName.has(interfaceName)) {
      dependenciesByDefinitionName.set(interfaceName, new Set());
    }
    dependenciesByDefinitionName.get(interfaceName).add(typeName);
  });
}

function visitUnionTypeExtensionNode(node: UnionTypeExtensionNode, dependencySet: Set<string>) {
  dependencySet.add(node.name.value);
  node.directives.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  node.types.forEach(namedTypeNode => visitNamedTypeNode(namedTypeNode, dependencySet));
}

function visitEnumTypeExtensionNode(node: EnumTypeExtensionNode, dependencySet: Set<string>) {
  dependencySet.add(node.name.value);
  node.directives.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
}

function visitInputObjectTypeExtensionNode(
  node: InputObjectTypeExtensionNode,
  dependencySet: Set<string>,
  dependenciesByDefinitionName: Map<string, Set<string>>
) {
  dependencySet.add(node.name.value);
  node.directives.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  node.fields.forEach(inputValueDefinitionNode =>
    visitInputValueDefinitionNode(inputValueDefinitionNode, dependencySet, dependenciesByDefinitionName)
  );
}

function visitSchemaDefinitionNode(node: SchemaDefinitionNode, dependencySet: Set<string>) {
  dependencySet.add('schema');
  node.directives.forEach(directiveNode => visitDirectiveNode(directiveNode, dependencySet));
  node.operationTypes.forEach(operationTypeDefinitionNode =>
    visitOperationTypeDefinitionNode(operationTypeDefinitionNode, dependencySet)
  );
}

function visitOperationTypeDefinitionNode(node: OperationTypeDefinitionNode, dependencySet: Set<string>) {
  visitNamedTypeNode(node.type, dependencySet);
}
