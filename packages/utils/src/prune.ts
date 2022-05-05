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
} from 'graphql';

import { PruneSchemaOptions } from './types';

import { mapSchema } from './mapSchema';
import { MapperKind } from './Interfaces';
import { getRootTypes } from './rootTypes';
import { getImplementingTypes } from './get-implementing-types';

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
  // Type encountered that are attribute return types
  // If a interface is not returned directly, then it is not necessary to include all its unused implementations
  // The boolean value is to indicate that it is a interface that must be reprocessed
  const returnedTypes: { string: boolean } = Object.create(null);

  // This function will push to both the return types set and queue
  function pushAll(typeNames: string[]) {
    for (const typeName of typeNames) {
      // Only add once
      if (typeName in returnedTypes) {
        continue;
      }
      returnedTypes[typeName] = false;
    }
    queue.push(...typeNames);
  }

  // Navigate all types starting with pre-queued types (root types)
  while (queue.length) {
    const typeName = queue.pop() as string;
    const type = schema.getType(typeName);

    // Skip types we already visited
    if (visited.has(typeName)) {
      // Unless it is an interface that hasn't been flagged as a return type
      if (isInterfaceType(type) && typeName in returnedTypes) {
        // Ignore if flag is false to process again
        if (returnedTypes[typeName] === false) {
          continue;
        }
        // Only reprocess it once
        returnedTypes[typeName] = false;
      } else {
        continue;
      }
    }

    if (type) {
      // Get types for union
      if (isUnionType(type)) {
        pushAll(type.getTypes().map(type => type.name));
      }
      // If it is an interface and it is a returned type, grab all implementations so we can use proper __typename in fragments
      if (isInterfaceType(type) && typeName in returnedTypes) {
        pushAll(getImplementingTypes(type.name, schema));
      }
      // Visit interfaces this type is implementing if they haven't been visited yet
      if ('getInterfaces' in type) {
        // Only pushes to queue to visit but not return types
        queue.push(...type.getInterfaces().map(iface => iface.name));
      }
      // If the type has files visit those field types
      if ('getFields' in type) {
        const fields = type.getFields() as GraphQLFieldMap<any, any>;
        const entries = Object.entries(fields);

        if (!entries.length) {
          continue;
        }

        for (const [, field] of entries) {
          if (isObjectType(type)) {
            // Visit arg types
            pushAll(field.args.map(arg => getNamedType(arg.type).name));
          }

          const namedType = getNamedType(field.type);

          queue.push(namedType.name);

          // Add to return types for interface decisions
          if (!(namedType.name in returnedTypes)) {
            // If it is an interface type that hasn't been encountered yet, it should be flagged to reprocess
            returnedTypes[namedType.name] = !!isInterfaceType(namedType);
          }
        }
      }

      visited.add(typeName); // Mark as visited (and therefore it is used and should be kept)
    }
  }
  return visited;
}
