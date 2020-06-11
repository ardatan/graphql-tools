import {
  GraphQLSchema,
  GraphQLNamedType,
  GraphQLScalarType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLEnumType,
  GraphQLInputObjectType,
  getNamedType,
  isObjectType,
  isInterfaceType,
  isUnionType,
  isInputObjectType,
} from 'graphql';

import { mapSchema, MapperKind } from '@graphql-tools/utils';

type NamedOutputType =
  | GraphQLObjectType
  | GraphQLInterfaceType
  | GraphQLUnionType
  | GraphQLEnumType
  | GraphQLScalarType;
type NamedInputType = GraphQLInputObjectType | GraphQLEnumType | GraphQLScalarType;

interface PruningContext {
  schema: GraphQLSchema;
  unusedTypes: Record<string, boolean>;
  implementations: Record<string, Record<string, boolean>>;
}

interface PruneSchemaOptions {
  skipEmptyCompositeTypePruning: boolean;
  skipUnimplementedInterfacesPruning: boolean;
  skipEmptyUnionPruning: boolean;
  skipUnusedTypesPruning: boolean;
}

export function pruneSchema(schema: GraphQLSchema, options: PruneSchemaOptions): GraphQLSchema {
  const pruningContext: PruningContext = {
    schema,
    unusedTypes: Object.create(null),
    implementations: Object.create(null),
  };

  Object.keys(schema.getTypeMap()).forEach(typeName => {
    const type = schema.getType(typeName);
    if ('getInterfaces' in type) {
      type.getInterfaces().forEach(iface => {
        if (pruningContext.implementations[iface.name] == null) {
          pruningContext.implementations[iface.name] = Object.create(null);
        }
        pruningContext.implementations[iface.name][type.name] = true;
      });
    }
  });

  visitTypes(pruningContext, schema);

  return mapSchema(schema, {
    [MapperKind.TYPE]: (type: GraphQLNamedType) => {
      if (isObjectType(type) || isInputObjectType(type)) {
        if (
          (!Object.keys(type.getFields()).length && !options.skipEmptyCompositeTypePruning) ||
          (pruningContext.unusedTypes[type.name] && !options.skipUnusedTypesPruning)
        ) {
          return null;
        }
      } else if (isUnionType(type)) {
        if (
          (!type.getTypes().length && !options.skipEmptyUnionPruning) ||
          (pruningContext.unusedTypes[type.name] && !options.skipUnusedTypesPruning)
        ) {
          return null;
        }
      } else if (isInterfaceType(type)) {
        if (
          (!Object.keys(type.getFields()).length && !options.skipEmptyCompositeTypePruning) ||
          (!Object.keys(pruningContext.implementations[type.name]).length &&
            !options.skipUnimplementedInterfacesPruning) ||
          (pruningContext.unusedTypes[type.name] && !options.skipUnusedTypesPruning)
        ) {
          return null;
        }
      } else {
        if (pruningContext.unusedTypes[type.name] && !options.skipUnusedTypesPruning) {
          return null;
        }
      }
    },
  });
}

function visitOutputType(
  visitedTypes: Record<string, boolean>,
  pruningContext: PruningContext,
  type: NamedOutputType
): void {
  if (visitedTypes[type.name]) {
    return;
  }

  visitedTypes[type.name] = true;
  pruningContext.unusedTypes[type.name] = false;

  if (isObjectType(type) || isInterfaceType(type)) {
    const fields = type.getFields();
    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      const namedType = getNamedType(field.type) as NamedOutputType;
      visitOutputType(visitedTypes, pruningContext, namedType);

      const args = field.args;
      args.forEach(arg => {
        const type = getNamedType(arg.type) as NamedInputType;
        visitInputType(visitedTypes, pruningContext, type);
      });
    });

    if (isInterfaceType(type)) {
      Object.keys(pruningContext.implementations[type.name]).forEach(typeName => {
        visitOutputType(visitedTypes, pruningContext, pruningContext.schema.getType(typeName) as NamedOutputType);
      });
    }

    if ('getInterfaces' in type) {
      type.getInterfaces().forEach(type => {
        visitOutputType(visitedTypes, pruningContext, type);
      });
    }
  } else if (isUnionType(type)) {
    const types = type.getTypes();
    types.forEach(type => visitOutputType(visitedTypes, pruningContext, type));
  }
}

function visitInputType(
  visitedTypes: Record<string, boolean>,
  pruningContext: PruningContext,
  type: NamedInputType
): void {
  if (visitedTypes[type.name]) {
    return;
  }

  pruningContext.unusedTypes[type.name] = false;

  if (isInputObjectType(type)) {
    const fields = type.getFields();
    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      const namedType = getNamedType(field.type) as NamedInputType;
      visitInputType(visitedTypes, pruningContext, namedType);
    });
  }

  visitedTypes[type.name] = true;
}

function visitTypes(pruningContext: PruningContext, schema: GraphQLSchema): void {
  Object.keys(schema.getTypeMap()).forEach(typeName => {
    if (!typeName.startsWith('__')) {
      pruningContext.unusedTypes[typeName] = true;
    }
  });

  const visitedTypes: Record<string, boolean> = Object.create(null);

  const rootTypes = [schema.getQueryType(), schema.getMutationType(), schema.getSubscriptionType()].filter(
    type => type != null
  );

  rootTypes.forEach(rootType => visitOutputType(visitedTypes, pruningContext, rootType));

  schema.getDirectives().forEach(directive => {
    directive.args.forEach(arg => {
      const type = getNamedType(arg.type) as NamedInputType;
      visitInputType(visitedTypes, pruningContext, type);
    });
  });
}
