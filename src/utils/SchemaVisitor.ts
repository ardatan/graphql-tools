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
  public schema!: GraphQLSchema;

  // Determine if this SchemaVisitor (sub)class implements a particular
  // visitor method.
  public static implementsVisitorMethod(methodName: string): boolean {
    if (!methodName.startsWith('visit')) {
      return false;
    }

    const method = this.prototype[methodName];
    if (typeof method !== 'function') {
      return false;
    }

    if (this.name === 'SchemaVisitor') {
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

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public visitSchema(_schema: GraphQLSchema): void {}

  public visitScalar(
    _scalar: GraphQLScalarType,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ): GraphQLScalarType | void | null {}

  public visitObject(
    _object: GraphQLObjectType,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ): GraphQLObjectType | void | null {}

  public visitFieldDefinition(
    _field: GraphQLField<any, any>,
    _details: {
      objectType: GraphQLObjectType | GraphQLInterfaceType;
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ): GraphQLField<any, any> | void | null {}

  public visitArgumentDefinition(
    _argument: GraphQLArgument,
    _details: {
      field: GraphQLField<any, any>;
      objectType: GraphQLObjectType | GraphQLInterfaceType;
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ): GraphQLArgument | void | null {}

  public visitInterface(
    _iface: GraphQLInterfaceType,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ): GraphQLInterfaceType | void | null {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public visitUnion(_union: GraphQLUnionType): GraphQLUnionType | void | null {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public visitEnum(_type: GraphQLEnumType): GraphQLEnumType | void | null {}

  public visitEnumValue(
    _value: GraphQLEnumValue,
    _details: {
      enumType: GraphQLEnumType;
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ): GraphQLEnumValue | void | null {}

  public visitInputObject(
    _object: GraphQLInputObjectType,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ): GraphQLInputObjectType | void | null {}

  public visitInputFieldDefinition(
    _field: GraphQLInputField,
    _details: {
      objectType: GraphQLInputObjectType;
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ): GraphQLInputField | void | null {}
}
