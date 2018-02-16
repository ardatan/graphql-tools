import {
  GraphQLArgument,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLEnumValue,
  GraphQLField,
  GraphQLInputField,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLUnionType,
  Kind,
  ValueNode,
} from 'graphql';

import {
  getArgumentValues,
} from 'graphql/execution/values';

export type VisitableSchemaType =
    GraphQLSchema
  | GraphQLObjectType
  | GraphQLInterfaceType
  | GraphQLNamedType
  | GraphQLScalarType
  | GraphQLField<any, any>
  | GraphQLArgument
  | GraphQLUnionType
  | GraphQLEnumType
  | GraphQLEnumValue;

const hasOwn = Object.prototype.hasOwnProperty;

// Abstract base class of any visitor implementation, defining the available
// visitor methods along with their parameter types, and providing a static
// helper function for determining whether a subclass implements a given
// visitor method, as opposed to inheriting one of the stubs defined here.
export abstract class SchemaVisitor {
  // All SchemaVisitor instances are created while visiting a specific
  // GraphQLSchema object, so this property holds a reference to that object,
  // in case a vistor method needs to refer to this.schema.
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
  // schema types/locations.
  /* tslint:disable:no-empty */
  public visitSchema(schema: GraphQLSchema) {}
  public visitScalar(scalar: GraphQLScalarType) {}
  public visitObject(object: GraphQLObjectType) {}
  public visitFieldDefinition(field: GraphQLField<any, any>, details: {
    objectType: GraphQLObjectType | GraphQLInterfaceType,
  }) {}
  public visitArgumentDefinition(argument: GraphQLArgument, details: {
    field: GraphQLField<any, any>,
    objectType: GraphQLObjectType | GraphQLInterfaceType,
  }) {}
  public visitInterface(iface: GraphQLInterfaceType) {}
  public visitUnion(union: GraphQLUnionType) {}
  public visitEnum(type: GraphQLEnumType) {}
  public visitEnumValue(value: GraphQLEnumValue, details: {
    enumType: GraphQLEnumType,
  }) {}
  public visitInputObject(object: GraphQLInputObjectType) {}
  public visitInputFieldDefinition(field: GraphQLInputField, details: {
    objectType: GraphQLInputObjectType,
  }) {}
  /* tslint:enable:no-empty */
}

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
) {
  // Helper function that calls visitorSelector and applies the resulting
  // visitors to the given type, with arguments [type, ...args].
  function callMethod(
    methodName: string,
    type: VisitableSchemaType,
    ...args: any[],
  ) {
    visitorSelector(type, methodName).forEach(visitor => {
      visitor[methodName](type, ...args);
    });
  }

  function visit(type: VisitableSchemaType) {
    if (type instanceof GraphQLSchema) {
      callMethod('visitSchema', type);

      each(type.getTypeMap(), (namedType, typeName) => {
        if (! typeName.startsWith('__')) {
          // Call visit recursively to let it determine which concrete
          // subclass of GraphQLNamedType we found in the type map.
          visit(namedType);
        }
      });

    } else if (type instanceof GraphQLObjectType) {
      // Note that callMethod('visitObject', type) may not actually call any
      // methods, if there are no @directive annotations associated with this
      // type, or this SchemaDirectiveVisitor subclass does not override the
      // visitObject method.
      callMethod('visitObject', type);
      visitFields(type);

    } else if (type instanceof GraphQLInterfaceType) {
      callMethod('visitInterface', type);
      visitFields(type);

    } else if (type instanceof GraphQLInputObjectType) {
      callMethod('visitInputObject', type);

      each(type.getFields(), field => {
        // Since we call a different method for input object fields, we
        // can't reuse the visitFields function here.
        callMethod('visitInputFieldDefinition', field, {
          objectType: type,
        });
      });

    } else if (type instanceof GraphQLScalarType) {
      callMethod('visitScalar', type);

    } else if (type instanceof GraphQLUnionType) {
      callMethod('visitUnion', type);

      // The GraphQL schema parser currently does not support @directive
      // syntax for union member types, so there's no point visiting them
      // here. That's a blessing in disguise, really, because the types
      // returned from type.getTypes() are references to GraphQLObjectType
      // objects defined elsewhere in the schema, which might be decorated
      // with directives of their own, so it would be hard to prevent this
      // loop from re-visiting those directives. To access the member types of
      // a union, just implement a SchemaVistior that overrides visitUnion,
      // and call unionType.getTypes() yourself.

      // type.getTypes().forEach(visit);

    } else if (type instanceof GraphQLEnumType) {
      callMethod('visitEnum', type);

      type.getValues().forEach(value => {
        callMethod('visitEnumValue', value, {
          enumType: type,
        });
      });
    }
  }

  function visitFields(type: GraphQLObjectType | GraphQLInterfaceType) {
    each(type.getFields(), field => {
      // It would be nice if we could call visit(field) recursively here, but
      // GraphQLField is merely a type, not a value that can be detected using
      // an instanceof check, so we have to visit the fields in this lexical
      // context, so that TypeScript can validate the call to
      // visitFieldDefinition.
      callMethod('visitFieldDefinition', field, {
        // While any field visitor needs a reference to the field object, some
        // field visitors may also need to know the enclosing (parent) type,
        // perhaps to determine if the parent is a GraphQLObjectType or a
        // GraphQLInterfaceType. To obtain a reference to the parent, a
        // visitor method can have a second parameter, which will be an object
        // with an .objectType property referring to the parent.
        objectType: type,
      });

      if (field.args) {
        field.args.forEach(arg => {
          callMethod('visitArgumentDefinition', arg, {
            // Like visitFieldDefinition, visitArgumentDefinition takes a
            // second parameter that provides additional context, namely the
            // parent .field and grandparent .objectType. Remember that the
            // current GraphQLSchema is always available via this.schema.
            field,
            objectType: type,
          });
        });
      }
    });
  }

  visit(schema);
}

// This class represents a reusable implementation of a @directive that may
// appear in a GraphQL schema written in Schema Definition Language.
//
// By overriding one or more visit{Object,Union,...} methods, a subclass
// registers interest in certain schema types, such as GraphQLObjectType,
// GraphQLUnionType, etc. When SchemaDirectiveVisitor.visitSchemaDirectives is
// called with a GraphQLSchema object and a map of visitor subclasses, the
// overidden methods of those subclasses allow the visitors to obtain
// references to any type objects that have @directives attached to them,
// enabling visitors to inspect or modify the schema as appropriate.
//
// For example, if a directive called @rest(url: "...") appears after a field
// definition, a SchemaDirectiveVisitor subclass could provide meaning to that
// directive by overriding the visitFieldDefinition method (which receives a
// GraphQLField parameter), and then the body of that visitor method could
// manipulate the field's resolver function to fetch data from a REST endpoint
// described by the url argument passed to the @rest directive:
//
//   const typeDefs = `
//   type Query {
//     people: [Person] @rest(url: "/api/v1/people")
//   }`;
//
//   const schema = makeExecutableSchema({ typeDefs });
//
//   SchemaDirectiveVisitor.visitSchemaDirectives(schema, {
//     rest: class extends SchemaDirectiveVisitor {
//       public visitFieldDefinition(field: GraphQLField<any, any>) {
//         const { url } = this.args;
//         field.resolve = () => fetch(url);
//       }
//     }
//   });
//
// The subclass in this example is defined as an anonymous class expression,
// for brevity. A truly reusable SchemaDirectiveVisitor would most likely be
// defined in a library using a named class declaration, and then exported for
// consumption by other modules and packages.
//
// See below for a complete list of overridable visitor methods, their
// parameter types, and more details about the properties exposed by instances
// of the SchemaDirectiveVisitor class.

export class SchemaDirectiveVisitor extends SchemaVisitor {
  // The name of the directive this visitor is allowed to visit (that is, the
  // identifier that appears after the @ character in the schema). Note that
  // this property is per-instance rather than static because subclasses of
  // SchemaDirectiveVisitor can be instantiated multiple times to visit
  // directives of different names. In other words, SchemaDirectiveVisitor
  // implementations are effectively anonymous, and it's up to the caller of
  // SchemaDirectiveVisitor.visitSchemaDirectives to assign names to them.
  public name: string;

  // A map from parameter names to argument values, as obtained from a
  // specific occurrence of a @directive(arg1: value1, arg2: value2, ...) in
  // the schema. Visitor methods may refer to this object via this.args.
  public args: { [name: string]: any };

  // A reference to the type object that this visitor was created to visit.
  public visitedType: VisitableSchemaType;

  // A shared object that will be available to all visitor instances via
  // this.context. Callers of visitSchemaDirectives can provide their own
  // object, or just use the default empty object.
  public context: { [key: string]: any };

  // Call SchemaDirectiveVisitor.visitSchemaDirectives to visit every
  // @directive in the schema and create an appropriate SchemaDirectiveVisitor
  // instance to visit the object decorated by the @directive.
  public static visitSchemaDirectives(
    schema: GraphQLSchema,
    directiveVisitors: {
      // The keys of this object correspond to directive names as they appear
      // in the schema, and the values should be subclasses (not instances!)
      // of the SchemaDirectiveVisitor class. This distinction is important
      // because a new SchemaDirectiveVisitor instance will be created each
      // time a matching directive is found in the schema AST, with arguments
      // and other metadata specific to that occurrence. To help prevent the
      // mistake of passing instances, the SchemaDirectiveVisitor constructor
      // method is marked as protected.
      [directiveName: string]: typeof SchemaDirectiveVisitor
    },
    // Optional context object that will be available to all visitor instances
    // via this.context. Defaults to an empty null-prototype object.
    context: {
      [key: string]: any
    } = Object.create(null),
  ): {
    // The visitSchemaDirectives method returns a map from directive names to
    // lists of SchemaDirectiveVisitors created while visiting the schema.
    [directiveName: string]: SchemaDirectiveVisitor[],
  } {
    // If the schema declares any directives for public consumption, record
    // them here so that we can properly coerce arguments when/if we encounter
    // an occurrence of the directive while walking the schema below.
    const declaredDirectives: {
      [directiveName: string]: GraphQLDirective,
    } = Object.create(null);
    schema.getDirectives().forEach(decl => {
      declaredDirectives[decl.name] = decl;
    });

    // Map from directive names to lists of SchemaDirectiveVisitor instances
    // created while visiting the schema.
    const createdVisitors: {
      [directiveName: string]: SchemaDirectiveVisitor[]
    } = Object.create(null);
    Object.keys(directiveVisitors).forEach(directiveName => {
      createdVisitors[directiveName] = [];
    });

    function visitorSelector(
      type: VisitableSchemaType,
      methodName: string,
    ): SchemaDirectiveVisitor[] {
      const visitors: SchemaDirectiveVisitor[] = [];
      const directiveNodes = type.astNode && type.astNode.directives;
      if (! directiveNodes) {
        return visitors;
      }

      directiveNodes.forEach(directiveNode => {
        const directiveName = directiveNode.name.value;
        if (! hasOwn.call(directiveVisitors, directiveName)) {
          return;
        }

        const visitorClass = directiveVisitors[directiveName];

        // Avoid creating visitor objects if visitorClass does not override
        // the visitor method named by methodName.
        if (! visitorClass.implementsVisitorMethod(methodName)) {
          return;
        }

        const decl = declaredDirectives[directiveName];
        let args: { [key: string]: any };

        if (decl) {
          // If this directive was explicitly declared, use the declared
          // argument types (and any default values) to check, coerce, and/or
          // supply default values for the given arguments.
          args = getArgumentValues(decl, directiveNode);
        } else {
          // If this directive was not explicitly declared, just convert the
          // argument nodes to their corresponding JavaScript values.
          args = Object.create(null);
          directiveNode.arguments.forEach(arg => {
            args[arg.name.value] = valueFromASTUntyped(arg.value);
          });
        }

        // As foretold in comments near the top of the visitSchemaDirectives
        // method, this is where instances of the SchemaDirectiveVisitor class
        // get created and assigned names. While subclasses could override the
        // constructor method, the constructor is marked as protected, so
        // these are the only arguments that will ever be passed.
        visitors.push(new visitorClass({
          name: directiveName,
          args,
          visitedType: type,
          schema,
          context,
        }));
      });

      if (visitors.length > 0) {
        visitors.forEach(visitor => {
          createdVisitors[visitor.name].push(visitor);
        });
      }

      return visitors;
    }

    visitSchema(schema, visitorSelector);

    return createdVisitors;
  }

  // Mark the constructor protected to enforce passing SchemaDirectiveVisitor
  // subclasses (not instances) to visitSchemaDirectives.
  protected constructor(config: {
    name: string
    args: { [name: string]: any }
    visitedType: VisitableSchemaType
    schema: GraphQLSchema
    context: { [key: string]: any }
  }) {
    super();
    this.name = config.name;
    this.args = config.args;
    this.visitedType = config.visitedType;
    this.schema = config.schema;
    this.context = config.context;
  }
}

// Helper widely used in the visit function above.
function each<V>(
  obj: { [key: string]: V },
  callback: (value: V, key: string) => void,
) {
  Object.keys(obj).forEach(key => {
    callback(obj[key], key);
  });
}

// Similar to the graphql-js function of the same name, slightly simplified:
// https://github.com/graphql/graphql-js/blob/master/src/utilities/valueFromASTUntyped.js
function valueFromASTUntyped(
  valueNode: ValueNode,
): any {
  switch (valueNode.kind) {
  case Kind.NULL:
    return null;
  case Kind.INT:
    return parseInt(valueNode.value, 10);
  case Kind.FLOAT:
    return parseFloat(valueNode.value);
  case Kind.STRING:
  case Kind.ENUM:
  case Kind.BOOLEAN:
    return valueNode.value;
  case Kind.LIST:
    return valueNode.values.map(valueFromASTUntyped);
  case Kind.OBJECT:
    const obj = Object.create(null);
    valueNode.fields.forEach(field => {
      obj[field.name.value] = valueFromASTUntyped(field.value);
    });
    return obj;
  /* istanbul ignore next */
  default:
    throw new Error('Unexpected value kind: ' + valueNode.kind);
  }
}
