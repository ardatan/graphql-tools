import {
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLObjectType,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLType,
  GraphQLUnionType,
  isNamedType
} from 'graphql';
import each from './each';
import updateEachKey from './updateEachKey';
import { VisitableSchemaType } from '../schemaVisitor';

type NamedTypeMap = {
  [key: string]: GraphQLNamedType;
};

const hasOwn = Object.prototype.hasOwnProperty;

export function healTypeMap(originalTypeMap: NamedTypeMap, directives: ReadonlyArray<GraphQLDirective>) {
  const actualNamedTypeMap: NamedTypeMap = Object.create(null);

  // If any of the .name properties of the GraphQLNamedType objects in
  // schema.getTypeMap() have changed, the keys of the type map need to
  // be updated accordingly.

  each(originalTypeMap, (namedType, typeName) => {
    if (typeName.startsWith('__')) {
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
    if (decl.args) {
      each(decl.args, arg => {
        arg.type = healType(arg.type);
      });
    }
  });

  each(originalTypeMap, (namedType, typeName) => {
    if (! typeName.startsWith('__')) {
      heal(namedType);
    }
  });

  updateEachKey(originalTypeMap, (namedType, typeName) => {
    // Dangling references to renamed types should remain in the schema
    // during healing, but must be removed now, so that the following
    // invariant holds for all names: schema.getType(name).name === name
    if (! typeName.startsWith('__') &&
        ! hasOwn.call(actualNamedTypeMap, typeName)) {
      return null;
    }
  });

  function heal(type: VisitableSchemaType) {
    if (type instanceof GraphQLObjectType) {
      healFields(type);
      updateEachKey(type.getInterfaces(), iface => healType(iface));

    } else if (type instanceof GraphQLInterfaceType) {
      healFields(type);

    } else if (type instanceof GraphQLInputObjectType) {
      healInputFields(type);

    } else if (type instanceof GraphQLScalarType) {
      // Nothing to do.

    } else if (type instanceof GraphQLUnionType) {
      updateEachKey(type.getTypes(), t => healType(t));

    } else if (type instanceof GraphQLEnumType) {
      // Nothing to do.

    } else {
      throw new Error(`Unexpected schema type: ${type}`);
    }
  }

  function healFields(type: GraphQLObjectType | GraphQLInterfaceType) {
    each(type.getFields(), field => {
      field.type = healType(field.type);
      if (field.args) {
        each(field.args, arg => {
          arg.type = healType(arg.type);
        });
      }
    });
  }

  function healInputFields(type: GraphQLInputObjectType) {
    each(type.getFields(), field => {
      field.type = healType(field.type);
    });
  }

  function healType<T extends GraphQLType>(type: T): T {
    // Unwrap the two known wrapper types
    if (type instanceof GraphQLList) {
      type = new GraphQLList(healType(type.ofType)) as T;
    } else if (type instanceof GraphQLNonNull) {
      type = new GraphQLNonNull(healType(type.ofType)) as T;
    } else if (isNamedType(type)) {
      // If a type annotation on a field or an argument or a union member is
      // any `GraphQLNamedType` with a `name`, then it must end up identical
      // to `schema.getType(name)`, since `schema.getTypeMap()` is the source
      // of truth for all named schema types.
      const namedType = type as GraphQLNamedType;
      const officialType = originalTypeMap[namedType.name];
      if (officialType && namedType !== officialType) {
        return officialType as T;
      }
    }
    return type;
  }
}
