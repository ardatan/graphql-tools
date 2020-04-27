import { keyBy, uniqBy, includes, reverse } from 'lodash';
import {
  NamedTypeNode,
  DirectiveNode,
  DirectiveDefinitionNode,
  InputValueDefinitionNode,
  FieldDefinitionNode,
  DefinitionNode,
  TypeNode,
  Kind,
  SelectionNode,
} from 'graphql';

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

export interface DefinitionMap {
  [key: string]: DefinitionNode;
}

/**
 * Post processing of all imported type definitions. Loops over each of the
 * imported type definitions, and processes it using collectNewTypeDefinitions.
 *
 * @param allDefinitions All definitions from all schemas
 * @param definitionPool Current definitions (from first schema)
 * @param newTypeDefinitions All imported definitions
 * @returns Final collection of type definitions for the resulting schema
 */
export function completeDefinitionPool(
  allDefinitions: DefinitionNode[],
  definitionPool: DefinitionNode[],
  newTypeDefinitions: DefinitionNode[]
): DefinitionNode[] {
  const visitedDefinitions: { [name: string]: boolean } = {};

  while (newTypeDefinitions.length > 0) {
    const schemaMap: DefinitionMap = keyBy(reverse(allDefinitions), d => ('name' in d ? d.name.value : 'schema'));
    const newDefinition = newTypeDefinitions.shift();

    const defName = 'name' in newDefinition ? newDefinition.name.value : 'schema';

    if (visitedDefinitions[defName]) {
      continue;
    }

    const collectedTypedDefinitions = collectNewTypeDefinitions(
      allDefinitions,
      definitionPool,
      newDefinition,
      schemaMap
    );

    newTypeDefinitions.push(...collectedTypedDefinitions);
    definitionPool.push(...collectedTypedDefinitions);

    visitedDefinitions[defName] = true;
  }

  return uniqBy(definitionPool, 'name.value');
}

/**
 * Processes a single type definition, and performs a number of checks:
 * - Add missing interface implementations
 * - Add missing referenced types
 * - Remove unused type definitions
 *
 * @param allDefinitions All definitions from all schemas
 * (only used to find missing interface implementations)
 * @param definitionPool Resulting definitions
 * @param newDefinition All imported definitions
 * @param schemaMap Map of all definitions for easy lookup
 * @returns All relevant type definitions to add to the final schema
 */
function collectNewTypeDefinitions(
  allDefinitions: DefinitionNode[],
  definitionPool: DefinitionNode[],
  newDefinition: DefinitionNode,
  schemaMap: DefinitionMap
): DefinitionNode[] {
  const newTypeDefinitions: DefinitionNode[] = [];

  if (newDefinition.kind !== Kind.DIRECTIVE_DEFINITION) {
    newDefinition.directives.forEach(collectDirective);
  }

  if (newDefinition.kind === Kind.ENUM_TYPE_DEFINITION) {
    newDefinition.values.forEach(value => value.directives.forEach(collectDirective));
  }

  if (newDefinition.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION) {
    newDefinition.fields.forEach(collectNode);
  }

  if (newDefinition.kind === Kind.INTERFACE_TYPE_DEFINITION) {
    const interfaceName = newDefinition.name.value;

    newDefinition.fields.forEach(collectNode);

    const interfaceImplementations = allDefinitions.filter(
      d => d.kind === Kind.OBJECT_TYPE_DEFINITION && d.interfaces.some(i => i.name.value === interfaceName)
    );
    newTypeDefinitions.push(...interfaceImplementations);
  }

  if (newDefinition.kind === Kind.UNION_TYPE_DEFINITION) {
    newDefinition.types.forEach(type => {
      if (!definitionPool.some(d => 'name' in d && d.name.value === type.name.value)) {
        const typeName = type.name.value;
        const typeMatch = schemaMap[typeName];

        if (!typeMatch) {
          throw new Error(`Couldn't find type ${typeName} in any of the schemas.`);
        }

        newTypeDefinitions.push(schemaMap[type.name.value]);
      }
    });
  }

  if (newDefinition.kind === Kind.OBJECT_TYPE_DEFINITION) {
    // collect missing interfaces
    newDefinition.interfaces.forEach(int => {
      if (!definitionPool.some(d => 'name' in d && d.name.value === int.name.value)) {
        const interfaceName = int.name.value;
        const interfaceMatch = schemaMap[interfaceName];

        if (!interfaceMatch) {
          throw new Error(`Couldn't find interface ${interfaceName} in any of the schemas.`);
        }

        newTypeDefinitions.push(schemaMap[int.name.value]);
      }
    });

    // iterate over all fields
    newDefinition.fields.forEach(field => {
      collectNode(field);
      // collect missing argument input types
      field.arguments.forEach(collectNode);
    });
  }

  if (newDefinition.kind === Kind.SCHEMA_DEFINITION) {
    newDefinition.operationTypes.forEach(operationType => {
      if (!definitionPool.some(d => 'name' in d && d.name.value === operationType.type.name.value)) {
        const typeName = operationType.type.name.value;
        const typeMatch = schemaMap[typeName];

        if (!typeMatch) {
          throw new Error(`Couldn't find type ${typeName} in any of the schemas.`);
        }

        newTypeDefinitions.push(schemaMap[operationType.type.name.value]);
      }
    });
  }

  if (newDefinition.kind === Kind.OPERATION_DEFINITION || newDefinition.kind === Kind.FRAGMENT_DEFINITION) {
    if (newDefinition.selectionSet) {
      for (const selection of newDefinition.selectionSet.selections) {
        collectFragments(selection);
      }
    }
  }

  return newTypeDefinitions;

  function collectFragments(node: SelectionNode) {
    if (node.kind === Kind.FRAGMENT_SPREAD) {
      const fragmentName = node.name.value;

      if (!definitionPool.some(d => 'name' in d && d.name.value === fragmentName)) {
        const fragmentMatch = schemaMap[fragmentName];

        if (!fragmentMatch) {
          throw new Error(`Fragment ${fragmentName}: Couldn't find fragment ${fragmentName} in any of the documents.`);
        }

        newTypeDefinitions.push(fragmentMatch);
      }
    } else if (node.selectionSet) {
      for (const selection of node.selectionSet.selections) {
        for (const directive of node.directives) {
          collectDirective(directive);
        }
        collectFragments(selection);
      }
    }
  }

  function collectNode(node: FieldDefinitionNode | InputValueDefinitionNode) {
    const nodeType = getNamedType(node.type);
    const nodeTypeName = nodeType.name.value;

    // collect missing argument input types
    if (
      !definitionPool.some(d => 'name' in d && d.name.value === nodeTypeName) &&
      !includes(builtinTypes, nodeTypeName)
    ) {
      const argTypeMatch = schemaMap[nodeTypeName];

      if (!argTypeMatch) {
        throw new Error(`Field ${node.name.value}: Couldn't find type ${nodeTypeName} in any of the schemas.`);
      }

      newTypeDefinitions.push(argTypeMatch);
    }

    node.directives.forEach(collectDirective);
  }

  function collectDirective(directive: DirectiveNode) {
    const directiveName = directive.name.value;
    if (
      !definitionPool.some(d => 'name' in d && d.name.value === directiveName) &&
      !includes(builtinDirectives, directiveName)
    ) {
      const directive = schemaMap[directiveName] as DirectiveDefinitionNode;

      if (!directive) {
        throw new Error(`Directive ${directiveName}: Couldn't find type ${directiveName} in any of the schemas.`);
      }

      directive.arguments.forEach(collectNode);
      newTypeDefinitions.push(directive);
    }
  }
}

/**
 * Nested visitor for a type node to get to the final NamedType
 *
 * @param {TypeNode} type Type node to get NamedTypeNode for
 * @returns {NamedTypeNode} The found NamedTypeNode
 */
function getNamedType(type: TypeNode): NamedTypeNode {
  if (type.kind === Kind.NAMED_TYPE) {
    return type;
  }

  return getNamedType(type.type);
}
