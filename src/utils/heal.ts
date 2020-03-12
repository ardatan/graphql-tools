import {
  GraphQLDirective,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLObjectType,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLType,
  GraphQLUnionType,
  isNamedType,
  GraphQLSchema,
  GraphQLInputType,
  GraphQLOutputType,
  isObjectType,
  isInterfaceType,
  isUnionType,
  isInputObjectType,
  isLeafType,
  isListType,
  isNonNullType,
} from 'graphql';

import { toConfig } from '../polyfills';

import each from './each';
import updateEachKey from './updateEachKey';
import { isStub, getBuiltInForStub } from './stub';
import { graphqlVersion } from './graphqlVersion';

type NamedTypeMap = {
  [key: string]: GraphQLNamedType;
};

const hasOwn = Object.prototype.hasOwnProperty;

// Update any references to named schema types that disagree with the named
// types found in schema.getTypeMap().
export function healSchema(schema: GraphQLSchema): GraphQLSchema {
  const typeMap = schema.getTypeMap();
  const directives = schema.getDirectives();

  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();
  const subscriptionType = schema.getSubscriptionType();

  const newQueryTypeName =
    queryType != null
      ? typeMap[queryType.name] != null
        ? typeMap[queryType.name].name
        : undefined
      : undefined;
  const newMutationTypeName =
    mutationType != null
      ? typeMap[mutationType.name] != null
        ? typeMap[mutationType.name].name
        : undefined
      : undefined;
  const newSubscriptionTypeName =
    subscriptionType != null
      ? typeMap[subscriptionType.name] != null
        ? typeMap[subscriptionType.name].name
        : undefined
      : undefined;

  healTypes(typeMap, directives);

  const filteredTypeMap = {};

  Object.keys(typeMap).forEach(typeName => {
    if (!typeName.startsWith('__')) {
      filteredTypeMap[typeName] = typeMap[typeName];
    }
  });

  const healedSchema = new GraphQLSchema({
    ...toConfig(schema),
    query: newQueryTypeName ? filteredTypeMap[newQueryTypeName] : undefined,
    mutation: newMutationTypeName
      ? filteredTypeMap[newMutationTypeName]
      : undefined,
    subscription: newSubscriptionTypeName
      ? filteredTypeMap[newSubscriptionTypeName]
      : undefined,
    types: Object.keys(filteredTypeMap).map(
      typeName => filteredTypeMap[typeName],
    ),
    directives: directives.slice(),
  });

  // Reconstruct the schema to reinitialize private variables
  // e.g. the stored implementation map and the proper root types.
  Object.assign(schema, healedSchema);

  return schema;
}

export function healTypes(
  originalTypeMap: Record<string, GraphQLNamedType | null>,
  directives: ReadonlyArray<GraphQLDirective>,
  config: {
    skipPruning: boolean;
  } = {
    skipPruning: false,
  },
) {
  const actualNamedTypeMap: NamedTypeMap = Object.create(null);

  // If any of the .name properties of the GraphQLNamedType objects in
  // schema.getTypeMap() have changed, the keys of the type map need to
  // be updated accordingly.

  each(originalTypeMap, (namedType, typeName) => {
    if (namedType == null || typeName.startsWith('__')) {
      return;
    }

    const actualName = namedType.name;
    if (actualName.startsWith('__')) {
      return;
    }

    if (hasOwn.call(actualNamedTypeMap, actualName)) {
      throw new Error(`Duplicate schema type name ${actualName}`);
    }

    actualNamedTypeMap[actualName] = namedType;

    // Note: we are deliberately leaving namedType in the schema by its
    // original name (which might be different from actualName), so that
    // references by that name can be healed.
  });

  // Now add back every named type by its actual name.
  each(actualNamedTypeMap, (namedType, typeName) => {
    originalTypeMap[typeName] = namedType;
  });

  // Directive declaration argument types can refer to named types.
  each(directives, (decl: GraphQLDirective) => {
    updateEachKey(decl.args, arg => {
      arg.type = healType(arg.type) as GraphQLInputType;
      return arg.type === null ? null : arg;
    });
  });

  each(originalTypeMap, (namedType, typeName) => {
    // Heal all named types, except for dangling references, kept only to redirect.
    if (
      !typeName.startsWith('__') &&
      hasOwn.call(actualNamedTypeMap, typeName)
    ) {
      if (namedType != null) {
        healNamedType(namedType);
      }
    }
  });

  updateEachKey(originalTypeMap, (_namedType, typeName) => {
    // Dangling references to renamed types should remain in the schema
    // during healing, but must be removed now, so that the following
    // invariant holds for all names: schema.getType(name).name === name
    if (
      !typeName.startsWith('__') &&
      !hasOwn.call(actualNamedTypeMap, typeName)
    ) {
      return null;
    }
  });

  if (!config.skipPruning) {
    pruneTypes(originalTypeMap, directives);
  }

  function healNamedType(type: GraphQLNamedType) {
    if (isObjectType(type)) {
      healFields(type);
      healInterfaces(type);
      return;
    } else if (isInterfaceType(type)) {
      healFields(type);
      if (graphqlVersion() >= 15) {
        healInterfaces(type);
      }
      return;
    } else if (isUnionType(type)) {
      healUnderlyingTypes(type);
      return;
    } else if (isInputObjectType(type)) {
      healInputFields(type);
      return;
    } else if (isLeafType(type)) {
      return;
    }

    throw new Error(`Unexpected schema type: ${type as string}`);
  }

  function healFields(type: GraphQLObjectType | GraphQLInterfaceType) {
    updateEachKey(type.getFields(), field => {
      updateEachKey(field.args, arg => {
        arg.type = healType(arg.type) as GraphQLInputType;
        return arg.type === null ? null : arg;
      });
      field.type = healType(field.type) as GraphQLOutputType;
      return field.type === null ? null : field;
    });
  }

  function healInterfaces(type: GraphQLObjectType | GraphQLInterfaceType) {
    updateEachKey((type as GraphQLObjectType).getInterfaces(), iface => {
      const healedType = healType(iface) as GraphQLInterfaceType;
      return healedType;
    });
  }

  function healInputFields(type: GraphQLInputObjectType) {
    updateEachKey(type.getFields(), field => {
      field.type = healType(field.type) as GraphQLInputType;
      return field.type === null ? null : field;
    });
  }

  function healUnderlyingTypes(type: GraphQLUnionType) {
    updateEachKey(type.getTypes(), (t: GraphQLOutputType) => {
      const healedType = healType(t) as GraphQLOutputType;
      return healedType;
    });
  }

  function healType<T extends GraphQLType>(type: T): GraphQLType | null {
    // Unwrap the two known wrapper types
    if (isListType(type)) {
      const healedType = healType(type.ofType);
      return healedType != null ? new GraphQLList(healedType) : null;
    } else if (isNonNullType(type)) {
      const healedType = healType(type.ofType);
      return healedType != null ? new GraphQLNonNull(healedType) : null;
    } else if (isNamedType(type)) {
      // If a type annotation on a field or an argument or a union member is
      // any `GraphQLNamedType` with a `name`, then it must end up identical
      // to `schema.getType(name)`, since `schema.getTypeMap()` is the source
      // of truth for all named schema types.
      // Note that new types can still be simply added by adding a field, as
      // the official type will be undefined, not null.
      let officialType = originalTypeMap[type.name];
      if (officialType === undefined) {
        if (isStub(type)) {
          officialType = getBuiltInForStub(type);
        } else {
          officialType = type;
        }
        originalTypeMap[type.name] = officialType;
      }
      return officialType;
    }

    return null;
  }
}

function pruneTypes(
  typeMap: Record<string, GraphQLNamedType | null>,
  directives: ReadonlyArray<GraphQLDirective>,
) {
  const implementedInterfaces = {};
  each(typeMap, namedType => {
    if (
      isObjectType(namedType) ||
      (graphqlVersion() >= 15 && isInterfaceType(namedType))
    ) {
      each((namedType as GraphQLObjectType).getInterfaces(), iface => {
        implementedInterfaces[iface.name] = true;
      });
    }
  });

  let prunedTypeMap = false;
  const typeNames = Object.keys(typeMap);
  for (let i = 0; i < typeNames.length; i++) {
    const typeName = typeNames[i];
    const type = typeMap[typeName];
    if (isObjectType(type) || isInputObjectType(type)) {
      // prune types with no fields
      if (!Object.keys(type.getFields()).length) {
        typeMap[typeName] = null;
        prunedTypeMap = true;
      }
    } else if (isUnionType(type)) {
      // prune unions without underlying types
      if (!type.getTypes().length) {
        typeMap[typeName] = null;
        prunedTypeMap = true;
      }
    } else if (isInterfaceType(type)) {
      // prune interfaces without fields or without implementations
      if (
        !Object.keys(type.getFields()).length ||
        !implementedInterfaces[type.name]
      ) {
        typeMap[typeName] = null;
        prunedTypeMap = true;
      }
    }
  }

  // every prune requires another round of healing
  if (prunedTypeMap) {
    healTypes(typeMap, directives);
  }
}
