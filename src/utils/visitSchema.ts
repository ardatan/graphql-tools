import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLUnionType,
} from 'graphql';

import updateEachKey from './updateEachKey';
import { VisitableSchemaType } from '../Interfaces';
import { SchemaVisitor } from './SchemaVisitor';
import { healSchema } from './heal';

// Generic function for visiting GraphQLSchema objects.
export function visitSchema(
  schema: GraphQLSchema,
  // To accommodate as many different visitor patterns as possible, the
  // visitSchema function does not simply accept a single instance of the
  // SchemaVisitor class, but instead accepts a function that takes the
  // current VisitableSchemaType object and the name of a visitor method and
  // returns an array of SchemaVisitor instances that implement the visitor
  // method and have an interest in handling the given VisitableSchemaType
  // object. In the simplest case, this function can always return an array
  // containing a single visitor object, without even looking at the type or
  // methodName parameters. In other cases, this function might sometimes
  // return an empty array to indicate there are no visitors that should be
  // applied to the given VisitableSchemaType object. For an example of a
  // visitor pattern that benefits from this abstraction, see the
  // SchemaDirectiveVisitor class below.
  visitorSelector: (
    type: VisitableSchemaType,
    methodName: string,
  ) => SchemaVisitor[],
): GraphQLSchema {
  // Helper function that calls visitorSelector and applies the resulting
  // visitors to the given type, with arguments [type, ...args].
  function callMethod<T extends VisitableSchemaType>(
    methodName: string,
    type: T,
    ...args: any[]
  ): T {
    visitorSelector(type, methodName).every(visitor => {
      const newType = visitor[methodName](type, ...args);

      if (typeof newType === 'undefined') {
        // Keep going without modifying type.
        return true;
      }

      if (methodName === 'visitSchema' ||
          type instanceof GraphQLSchema) {
        throw new Error(`Method ${methodName} cannot replace schema with ${newType}`);
      }

      if (newType === null) {
        // Stop the loop and return null form callMethod, which will cause
        // the type to be removed from the schema.
        type = null;
        return false;
      }

      // Update type to the new type returned by the visitor method, so that
      // later directives will see the new type, and callMethod will return
      // the final type.
      type = newType;
      return true;
    });

    // If there were no directives for this type object, or if all visitor
    // methods returned nothing, type will be returned unmodified.
    return type;
  }

  // Recursive helper function that calls any appropriate visitor methods for
  // each object in the schema, then traverses the object's children (if any).
  function visit<T>(type: T): T {
    if (type instanceof GraphQLSchema) {
      // Unlike the other types, the root GraphQLSchema object cannot be
      // replaced by visitor methods, because that would make life very hard
      // for SchemaVisitor subclasses that rely on the original schema object.
      callMethod('visitSchema', type);

      updateEachKey(type.getTypeMap(), (namedType, typeName) => {
        if (! typeName.startsWith('__')) {
          // Call visit recursively to let it determine which concrete
          // subclass of GraphQLNamedType we found in the type map. Because
          // we're using updateEachKey, the result of visit(namedType) may
          // cause the type to be removed or replaced.
          return visit(namedType);
        }
      });

      return type;
    }

    if (type instanceof GraphQLObjectType) {
      // Note that callMethod('visitObject', type) may not actually call any
      // methods, if there are no @directive annotations associated with this
      // type, or if this SchemaDirectiveVisitor subclass does not override
      // the visitObject method.
      const newObject = callMethod('visitObject', type);
      if (newObject) {
        visitFields(newObject);
      }
      return newObject;
    }

    if (type instanceof GraphQLInterfaceType) {
      const newInterface = callMethod('visitInterface', type);
      if (newInterface) {
        visitFields(newInterface);
      }
      return newInterface;
    }

    if (type instanceof GraphQLInputObjectType) {
      const newInputObject = callMethod('visitInputObject', type);

      if (newInputObject) {
        updateEachKey(newInputObject.getFields(), field => {
          // Since we call a different method for input object fields, we
          // can't reuse the visitFields function here.
          return callMethod('visitInputFieldDefinition', field, {
            objectType: newInputObject,
          });
        });
      }

      return newInputObject;
    }

    if (type instanceof GraphQLScalarType) {
      return callMethod('visitScalar', type);
    }

    if (type instanceof GraphQLUnionType) {
      return callMethod('visitUnion', type);
    }

    if (type instanceof GraphQLEnumType) {
      const newEnum = callMethod('visitEnum', type);

      if (newEnum) {
        updateEachKey(newEnum.getValues(), value => {
          return callMethod('visitEnumValue', value, {
            enumType: newEnum,
          });
        });
      }

      return newEnum;
    }

    throw new Error(`Unexpected schema type: ${type}`);
  }

  function visitFields(type: GraphQLObjectType | GraphQLInterfaceType) {
    updateEachKey(type.getFields(), field => {
      // It would be nice if we could call visit(field) recursively here, but
      // GraphQLField is merely a type, not a value that can be detected using
      // an instanceof check, so we have to visit the fields in this lexical
      // context, so that TypeScript can validate the call to
      // visitFieldDefinition.
      const newField = callMethod('visitFieldDefinition', field, {
        // While any field visitor needs a reference to the field object, some
        // field visitors may also need to know the enclosing (parent) type,
        // perhaps to determine if the parent is a GraphQLObjectType or a
        // GraphQLInterfaceType. To obtain a reference to the parent, a
        // visitor method can have a second parameter, which will be an object
        // with an .objectType property referring to the parent.
        objectType: type,
      });

      if (newField && newField.args) {
        updateEachKey(newField.args, arg => {
          return callMethod('visitArgumentDefinition', arg, {
            // Like visitFieldDefinition, visitArgumentDefinition takes a
            // second parameter that provides additional context, namely the
            // parent .field and grandparent .objectType. Remember that the
            // current GraphQLSchema is always available via this.schema.
            field: newField,
            objectType: type,
          });
        });
      }

      return newField;
    });
  }

  visit(schema);

  // Automatically update any references to named schema types replaced
  // during the traversal, so implementors don't have to worry about that.
  healSchema(schema);

  // Return the original schema for convenience, even though it cannot have
  // been replaced or removed by the code above.
  return schema;
}
