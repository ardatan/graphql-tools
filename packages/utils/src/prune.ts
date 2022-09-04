import {
  GraphQLSchema,
  getNamedType,
  isObjectType,
  isInterfaceType,
  isUnionType,
  isInputObjectType,
  GraphQLFieldMap,
  isSpecifiedScalarType,
  isScalarType,
  isEnumType,
  ASTNode,
} from 'graphql';

import { PruneSchemaOptions } from './types.js';

import { mapSchema } from './mapSchema.js';
import { MapperKind } from './Interfaces.js';
import { getRootTypes } from './rootTypes.js';
import { getImplementingTypes } from './get-implementing-types.js';

/**
 * Prunes the provided schema, removing unused and empty types
 * @param schema The schema to prune
 * @param options Additional options for removing unused types from the schema
 */
export function pruneSchema(schema: GraphQLSchema, options: PruneSchemaOptions = {}): GraphQLSchema {
  const {
    skipEmptyCompositeTypePruning,
    skipEmptyUnionPruning,
    skipPruning,
    skipUnimplementedInterfacesPruning,
    skipUnusedTypesPruning,
  } = options;
  let prunedTypes: string[] = []; // Pruned types during mapping
  let prunedSchema: GraphQLSchema = schema;

  do {
    let visited = visitSchema(prunedSchema);

    // Custom pruning  was defined, so we need to pre-emptively revisit the schema accounting for this
    if (skipPruning) {
      const revisit = [];

      for (const typeName in prunedSchema.getTypeMap()) {
        if (typeName.startsWith('__')) {
          continue;
        }

        const type = prunedSchema.getType(typeName);

        // if we want to skip pruning for this type, add it to the list of types to revisit
        if (type && skipPruning(type)) {
          revisit.push(typeName);
        }
      }

      visited = visitQueue(revisit, prunedSchema, visited); // visit again
    }

    prunedTypes = [];

    prunedSchema = mapSchema(prunedSchema, {
      [MapperKind.TYPE]: type => {
        if (!visited.has(type.name) && !isSpecifiedScalarType(type)) {
          if (
            isUnionType(type) ||
            isInputObjectType(type) ||
            isInterfaceType(type) ||
            isObjectType(type) ||
            isScalarType(type)
          ) {
            // skipUnusedTypesPruning: skip pruning unused types
            if (skipUnusedTypesPruning) {
              return type;
            }
            // skipEmptyUnionPruning: skip pruning empty unions
            if (isUnionType(type) && skipEmptyUnionPruning && !Object.keys(type.getTypes()).length) {
              return type;
            }
            if (isInputObjectType(type) || isInterfaceType(type) || isObjectType(type)) {
              // skipEmptyCompositeTypePruning: skip pruning object types or interfaces with no fields
              if (skipEmptyCompositeTypePruning && !Object.keys(type.getFields()).length) {
                return type;
              }
            }
            // skipUnimplementedInterfacesPruning: skip pruning interfaces that are not implemented by any other types
            if (isInterfaceType(type) && skipUnimplementedInterfacesPruning) {
              return type;
            }
          }

          prunedTypes.push(type.name);
          visited.delete(type.name);

          return null;
        }
        return type;
      },
    });
  } while (prunedTypes.length); // Might have empty types and need to prune again

  return prunedSchema;
}

function visitSchema(schema: GraphQLSchema): Set<string> {
  const queue: string[] = []; // queue of nodes to visit

  // Grab the root types and start there
  for (const type of getRootTypes(schema)) {
    queue.push(type.name);
  }

  return visitQueue(queue, schema);
}

function visitQueue(queue: string[], schema: GraphQLSchema, visited: Set<string> = new Set<string>()): Set<string> {
  // Interfaces encountered that are field return types need to be revisited to add their implementations
  const revisit: Map<string, boolean> = new Map<string, boolean>();

  // Navigate all types starting with pre-queued types (root types)
  while (queue.length) {
    const typeName = queue.pop() as string;

    // Skip types we already visited unless it is an interface type that needs revisiting
    if (visited.has(typeName) && revisit[typeName] !== true) {
      continue;
    }

    const type = schema.getType(typeName);

    if (type) {
      // Get types for union
      if (isUnionType(type)) {
        queue.push(...type.getTypes().map(type => type.name));
      }
      // If it is an interface and it is a returned type, grab all implementations so we can use proper __typename in fragments
      if (isInterfaceType(type) && revisit[typeName] === true) {
        queue.push(...getImplementingTypes(type.name, schema));
        // No need to revisit this interface again
        revisit[typeName] = false;
      }
      if (isEnumType(type)) {
        // Visit enum values directives argument types
        queue.push(
          ...type.getValues().flatMap(value => {
            if (value.astNode) {
              return getDirectivesArgumentsTypeNames(schema, value.astNode);
            }
            return [];
          })
        );
      }
      // Visit interfaces this type is implementing if they haven't been visited yet
      if ('getInterfaces' in type) {
        // Only pushes to queue to visit but not return types
        queue.push(...type.getInterfaces().map(iface => iface.name));
      }
      // If the type has fields visit those field types
      if ('getFields' in type) {
        const fields = type.getFields() as GraphQLFieldMap<any, any>;
        const entries = Object.entries(fields);

        if (!entries.length) {
          continue;
        }

        for (const [, field] of entries) {
          if (isObjectType(type)) {
            // Visit arg types and arg directives arguments types
            queue.push(
              ...field.args.flatMap(arg => {
                const typeNames = [getNamedType(arg.type).name];
                if (arg.astNode) {
                  typeNames.push(...getDirectivesArgumentsTypeNames(schema, arg.astNode));
                }
                return typeNames;
              })
            );
          }

          const namedType = getNamedType(field.type);

          queue.push(namedType.name);

          if (field.astNode) {
            queue.push(...getDirectivesArgumentsTypeNames(schema, field.astNode));
          }

          // Interfaces returned on fields need to be revisited to add their implementations
          if (isInterfaceType(namedType) && !(namedType.name in revisit)) {
            revisit[namedType.name] = true;
          }
        }
      }

      if (type.astNode) {
        queue.push(...getDirectivesArgumentsTypeNames(schema, type.astNode));
      }

      visited.add(typeName); // Mark as visited (and therefore it is used and should be kept)
    }
  }
  return visited;
}

function getDirectivesArgumentsTypeNames(
  schema: GraphQLSchema,
  astNode: Extract<ASTNode, { readonly directives?: any }>
) {
  return (astNode.directives ?? []).flatMap(
    directive => schema.getDirective(directive.name.value)?.args.map(arg => getNamedType(arg.type).name) ?? []
  );
}
