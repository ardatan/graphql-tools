import {
  GraphQLArgument,
  GraphQLEnumType,
  GraphQLEnumValue,
  GraphQLField,
  GraphQLInputField,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLUnionType,
} from 'graphql';

// Abstract base class of any visitor implementation, defining the available
// visitor methods along with their parameter types, and providing a static
// helper function for determining whether a subclass implements a given
// visitor method, as opposed to inheriting one of the stubs defined here.
export abstract class SchemaVisitor {
  // All SchemaVisitor instances are created while visiting a specific
  // GraphQLSchema object, so this property holds a reference to that object,
  // in case a visitor method needs to refer to this.schema.
  public schema: GraphQLSchema;

  // Determine if this SchemaVisitor (sub)class implements a particular
  // visitor method.
  public static implementsVisitorMethod(methodName: string) {
    if (! methodName.startsWith('visit')) {
      return false;
    }

    const method = this.prototype[methodName];
    if (typeof method !== 'function') {
      return false;
    }

    if (this === SchemaVisitor) {
      // The SchemaVisitor class implements every visitor method.
      return true;
    }

    const stub = SchemaVisitor.prototype[methodName];
    if (method === stub) {
      // If this.prototype[methodName] was just inherited from SchemaVisitor,
      // then this class does not really implement the method.
      return false;
    }

    return true;
  }

  // Concrete subclasses of SchemaVisitor should override one or more of these
  // visitor methods, in order to express their interest in handling certain
  // schema types/locations. Each method may return null to remove the given
  // type from the schema, a non-null value of the same type to update the
  // type in the schema, or nothing to leave the type as it was.

  /* tslint:disable:no-empty */
  public visitSchema(schema: GraphQLSchema): void {}
  public visitScalar(scalar: GraphQLScalarType): GraphQLScalarType | void | null {}
  public visitObject(object: GraphQLObjectType): GraphQLObjectType | void | null {}
  public visitFieldDefinition(field: GraphQLField<any, any>, details: {
    objectType: GraphQLObjectType | GraphQLInterfaceType,
  }): GraphQLField<any, any> | void | null {}
  public visitArgumentDefinition(argument: GraphQLArgument, details: {
    field: GraphQLField<any, any>,
    objectType: GraphQLObjectType | GraphQLInterfaceType,
  }): GraphQLArgument | void | null {}
  public visitInterface(iface: GraphQLInterfaceType): GraphQLInterfaceType | void | null {}
  public visitUnion(union: GraphQLUnionType): GraphQLUnionType | void | null {}
  public visitEnum(type: GraphQLEnumType): GraphQLEnumType | void | null {}
  public visitEnumValue(value: GraphQLEnumValue, details: {
    enumType: GraphQLEnumType,
  }): GraphQLEnumValue | void | null {}
  public visitInputObject(object: GraphQLInputObjectType): GraphQLInputObjectType | void | null {}
  public visitInputFieldDefinition(field: GraphQLInputField, details: {
    objectType: GraphQLInputObjectType,
  }): GraphQLInputField | void | null {}
  /* tslint:enable:no-empty */
}
