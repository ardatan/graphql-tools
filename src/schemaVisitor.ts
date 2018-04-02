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
  DirectiveLocationEnum,
  GraphQLType,
  GraphQLList,
  GraphQLNonNull,
  isNamedType,
} from 'graphql';

import {
  getArgumentValues,
} from 'graphql/execution/values';

export type VisitableSchemaType =
    GraphQLSchema
  | GraphQLObjectType
  | GraphQLInterfaceType
  | GraphQLInputObjectType
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
  public visitScalar(scalar: GraphQLScalarType): GraphQLScalarType | void {}
  public visitObject(object: GraphQLObjectType): GraphQLObjectType | void {}
  public visitFieldDefinition(field: GraphQLField<any, any>, details: {
    objectType: GraphQLObjectType | GraphQLInterfaceType,
  }): GraphQLField<any, any> | void {}
  public visitArgumentDefinition(argument: GraphQLArgument, details: {
    field: GraphQLField<any, any>,
    objectType: GraphQLObjectType | GraphQLInterfaceType,
  }): GraphQLArgument | void {}
  public visitInterface(iface: GraphQLInterfaceType): GraphQLInterfaceType | void {}
  public visitUnion(union: GraphQLUnionType): GraphQLUnionType | void {}
  public visitEnum(type: GraphQLEnumType): GraphQLEnumType | void {}
  public visitEnumValue(value: GraphQLEnumValue, details: {
    enumType: GraphQLEnumType,
  }): GraphQLEnumValue | void {}
  public visitInputObject(object: GraphQLInputObjectType): GraphQLInputObjectType | void {}
  public visitInputFieldDefinition(field: GraphQLInputField, details: {
    objectType: GraphQLInputObjectType,
  }): GraphQLInputField | void {}
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

  // Return the original schema for convenience, even though it cannot have
  // been replaced or removed by the code above.
  return schema;
}

type NamedTypeMap = {
  [key: string]: GraphQLNamedType;
};

// Update any references to named schema types that disagree with the named
// types found in schema.getTypeMap().
export function healSchema(schema: GraphQLSchema) {
  heal(schema);
  return schema;

  function heal(type: VisitableSchemaType) {
    if (type instanceof GraphQLSchema) {
      const originalTypeMap: NamedTypeMap = type.getTypeMap();
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
      each(type.getDirectives(), decl => {
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

    } else if (type instanceof GraphQLObjectType) {
      healFields(type);
      each(type.getInterfaces(), iface => heal(iface));

    } else if (type instanceof GraphQLInterfaceType) {
      healFields(type);

    } else if (type instanceof GraphQLInputObjectType) {
      each(type.getFields(), field => {
        field.type = healType(field.type);
      });

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

  function healType<T extends GraphQLType>(type: T): T {
    if (type instanceof GraphQLList ||
        type instanceof GraphQLNonNull) {
      // Unwrap the two known wrapper types:
      // https://github.com/graphql/graphql-js/blob/master/src/type/wrappers.js
      type.ofType = healType(type.ofType);
    } else if (isNamedType(type)) {
      // If a type annotation on a field or an argument or a union member is
      // any `GraphQLNamedType` with a `name`, then it must end up identical
      // to `schema.getType(name)`, since `schema.getTypeMap()` is the source
      // of truth for all named schema types.
      const namedType = type as GraphQLNamedType;
      const officialType = schema.getType(namedType.name);
      if (officialType && namedType !== officialType) {
        return officialType as T;
      }
    }
    return type;
  }
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

  // Override this method to return a custom GraphQLDirective (or modify one
  // already present in the schema) to enforce argument types, provide default
  // argument values, or specify schema locations where this @directive may
  // appear. By default, any declaration found in the schema will be returned.
  public static getDirectiveDeclaration(
    directiveName: string,
    schema: GraphQLSchema,
  ): GraphQLDirective {
    return schema.getDirective(directiveName);
  }

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
    const declaredDirectives =
      this.getDeclaredDirectives(schema, directiveVisitors);

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

    // Automatically update any references to named schema types replaced
    // during the traversal, so implementors don't have to worry about that.
    healSchema(schema);

    return createdVisitors;
  }

  protected static getDeclaredDirectives(
    schema: GraphQLSchema,
    directiveVisitors: {
      [directiveName: string]: typeof SchemaDirectiveVisitor
    },
  ) {
    const declaredDirectives: {
      [directiveName: string]: GraphQLDirective,
    } = Object.create(null);

    each(schema.getDirectives(), decl => {
      declaredDirectives[decl.name] = decl;
    });

    // If the visitor subclass overrides getDirectiveDeclaration, and it
    // returns a non-null GraphQLDirective, use that instead of any directive
    // declared in the schema itself. Reasoning: if a SchemaDirectiveVisitor
    // goes to the trouble of implementing getDirectiveDeclaration, it should
    // be able to rely on that implementation.
    each(directiveVisitors, (visitorClass, directiveName) => {
      const decl = visitorClass.getDirectiveDeclaration(directiveName, schema);
      if (decl) {
        declaredDirectives[directiveName] = decl;
      }
    });

    each(declaredDirectives, (decl, name) => {
      if (! hasOwn.call(directiveVisitors, name)) {
        // SchemaDirectiveVisitors.visitSchemaDirectives might be called
        // multiple times with partial directiveVisitors maps, so it's not
        // necessarily an error for directiveVisitors to be missing an
        // implementation of a directive that was declared in the schema.
        return;
      }
      const visitorClass = directiveVisitors[name];

      each(decl.locations, loc => {
        const visitorMethodName = directiveLocationToVisitorMethodName(loc);
        if (SchemaVisitor.implementsVisitorMethod(visitorMethodName) &&
            ! visitorClass.implementsVisitorMethod(visitorMethodName)) {
          // While visitor subclasses may implement extra visitor methods,
          // it's definitely a mistake if the GraphQLDirective declares itself
          // applicable to certain schema locations, and the visitor subclass
          // does not implement all the corresponding methods.
          throw new Error(
            `SchemaDirectiveVisitor for @${name} must implement ${visitorMethodName} method`
          );
        }
      });
    });

    return declaredDirectives;
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

// Convert a string like "FIELD_DEFINITION" to "visitFieldDefinition".
function directiveLocationToVisitorMethodName(loc: DirectiveLocationEnum) {
  return 'visit' + loc.replace(/([^_]*)_?/g, (wholeMatch, part) => {
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  });
}

type IndexedObject<V> = { [key: string]: V } | V[];

function each<V>(
  arrayOrObject: IndexedObject<V>,
  callback: (value: V, key: string) => void,
) {
  Object.keys(arrayOrObject).forEach(key => {
    callback(arrayOrObject[key], key);
  });
}

// A more powerful version of each that has the ability to replace or remove
// array or object keys.
function updateEachKey<V>(
  arrayOrObject: IndexedObject<V>,
  // The callback can return nothing to leave the key untouched, null to remove
  // the key from the array or object, or a non-null V to replace the value.
  callback: (value: V, key: string) => V | void,
) {
  let deletedCount = 0;

  Object.keys(arrayOrObject).forEach(key => {
    const result = callback(arrayOrObject[key], key);

    if (typeof result === 'undefined') {
      return;
    }

    if (result === null) {
      delete arrayOrObject[key];
      deletedCount++;
      return;
    }

    arrayOrObject[key] = result;
  });

  if (deletedCount > 0 && Array.isArray(arrayOrObject)) {
    // Remove any holes from the array due to deleted elements.
    arrayOrObject.splice(0).forEach(elem => {
      arrayOrObject.push(elem);
    });
  }
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
