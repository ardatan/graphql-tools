import {
  DirectiveLocation,
  DirectiveLocationEnum,
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

export type VisitableType =
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

// This class represents a reusable implementation of a @directive that
// may appear in a GraphQL schema written in Schema Definition Language.
//
// By overriding one or more visit* methods, this class registers interest
// in certain schema types (e.g. GraphQLObjectType, GraphQLUnionType,
// etc.). When SchemaDirectiveVisitor.visitSchema is called, these methods
// allow the visitor to obtain references to those GraphQL*Type objects,
// so the implementation can inspect or modify them as appropriate.
//
// For example, if a directive called @rest(...) appears after an object
// field definition, a SchemaDirectiveVisitor subclass could provide
// meaning to that directive by overriding the visitFieldDefinition method
// (which receives a GraphQLField parameter, as well as additional details
// about the parent object type), and the body of that method could
// manipulate the field's resolver functions to fetch data from a REST
// endpoint described by the arguments to the @rest(...) directive:
//
//   const typeDefs = `
//   type Query {
//     people: [Person] @rest("/api/v1/people")
//   }`;
//
//   const schema = makeExecutableSchema({ typeDefs });
//
//   SchemaDirectiveVisitor.visitSchema(schema, {
//     rest: class extends SchemaDirectiveVisitor {
//       visitFieldDefinition(field: GraphQLField<any, any>) {
//         const [url] = this.args;
//         field.resolve = () => fetch(url);
//       }
//     }
//   });
//
export class SchemaDirectiveVisitor {
  // The name of the directive this visitor is allowed to visit (that is,
  // the identifier after the @ character in the schema). Note that this
  // property is per-instance rather than static because subclasses of
  // SchemaDirectiveVisitor can be instantiated multiple times to visit
  // directives of different names. In other words, SchemaDirectiveVisitor
  // implementations are effectively anonymous, and it's up to the caller
  // of SchemaDirectiveVisitor.visitSchema to assign names to them.
  public name: string;

  // A map from parameter names to argument values, as obtained from a
  // specific occurrence of a @directive(arg1, arg2, ...) in the schema.
  // If the directive is declared in the schema using the `declare ...`
  // syntax, then the corresponding GraphQLDirective object will also have
  // an `args` property; however, that represents the expected types (and
  // names and default values, etc.) of the arguments, rather than the
  // concrete argument values passed to a specific @directive.
  public args: { [name: string]: any };

  // All SchemaDirectiveVisitor instances are created while visiting a
  // specific GraphQLSchema object, so this property holds a reference to
  // that object, in case a vistor method needs to refer to this.schema.
  public schema: GraphQLSchema;

  // Call SchemaDirectiveVisitor.visitSchema(schema, directiveClasses) to
  // visit every @directive in the schema and instantiate an appropriate
  // SchemaDirectiveVisitor subclass to visit/handle/transform the object
  // decorated by the @directive.
  public static visitSchema(
    schema: GraphQLSchema,
    directiveClasses: {
      // Because a new SchemaDirectiveVisitor class will be instantiated
      // each time a certain directive is found in the schema AST, callers
      // of the visitSchema method should provide SchemaDirectiveVisitor
      // sub*classes* rather than instances as the values in this object.
      // The keys of the object correspond to directive names as they
      // appear in the schema.
      [name: string]: typeof SchemaDirectiveVisitor
    },
  ) {
    // If the schema declares any directives for public consumption, collect
    // them here so that we can coerce the arguments when/if we encounter an
    // instance of the directive while walking the schema below.
    const declaredDirectives: {
      [key: string]: GraphQLDirective,
    } = Object.create(null);
    schema.getDirectives().forEach(decl => {
      declaredDirectives[decl.name] = decl;
    });

    // Recursive helper for visiting nested schema type objects.
    function visit(type: VisitableType) {
      if (type instanceof GraphQLSchema) {
        getDirectives(type).forEach(d => {
          // This call type-checks because it's lexically nested inside an `if
          // (type instanceof GraphQLSchema)` conditional block. The same is
          // true of every other directive.visit* method call below.
          d.visitSchema(type);
        });

        each(type.getTypeMap(), (namedType, typeName) => {
          if (! typeName.startsWith('__')) {
            // Call visit recursively to let it determine which concrete
            // subclass of GraphQLNamedType we found in the type map.
            visit(namedType);
          }
        });

      } else if (type instanceof GraphQLObjectType) {
        // Note that getDirectives(type) will often return an empty array, when
        // there are no @directive annotations associated with this type.
        getDirectives(type).forEach(d => {
          d.visitObject(type);
        });

        visitFields(type);

      } else if (type instanceof GraphQLInterfaceType) {
        getDirectives(type).forEach(d => {
          d.visitInterface(type);
        });

        visitFields(type);

      } else if (type instanceof GraphQLInputObjectType) {
        getDirectives(type).forEach(d => {
          d.visitInputObject(type);
        });

        each(type.getFields(), field => {
          getDirectives(field).forEach(df => {
            // Since we call a different method for input object fields, we
            // can't reuse the visitFields function here.
            df.visitInputFieldDefinition(field, {
              objectType: type,
            });
          });
        });

      } else if (type instanceof GraphQLScalarType) {
        getDirectives(type).forEach(d => {
          d.visitScalar(type);
        });

      } else if (type instanceof GraphQLUnionType) {
        getDirectives(type).forEach(d => {
          d.visitUnion(type);
        });

        // The GraphQL schema parser currently does not support @directive
        // syntax for union member types, so there's no point visiting
        // them here. That's a blessing in disguise, really, because the
        // types returned from type.getTypes() are references to
        // GraphQLObjectType objects defined elsewhere in the schema,
        // which might already have directives of their own, so it would
        // be hard to prevent this loop from re-visiting those directives.
        // If you really need to access the member types of a union, just
        // implement a SchemaDirectiveVisitor that overrides visitUnion,
        // and call unionType.getTypes() yourself.

        // type.getTypes().forEach(visit);

      } else if (type instanceof GraphQLEnumType) {
        getDirectives(type).forEach(d => {
          d.visitEnum(type);
        });

        type.getValues().forEach(value => {
          getDirectives(value).forEach(dv => {
            dv.visitEnumValue(value, {
              enumType: type,
            });
          });
        });
      }
    }

    function visitFields(type: GraphQLObjectType | GraphQLInterfaceType) {
      each(type.getFields(), field => {
        // It would be nice if we could call visit(field) recursively here, but
        // GraphQLField is merely a type, not a value that can be detected using
        // an instanceof check, so we have to visit the fields right here, so
        // TypeScript can validate the call to visitFieldDefinition.
        getDirectives(field).forEach(df => {
          // TODO Since we use the same method for both GraphQLObjectType and
          // GraphQLInterfaceType fields, we will probably need to provide some
          // additional means of disambiguation, such as passing in the parent
          // type as a second argument.
          df.visitFieldDefinition(field, {
            objectType: type,
          });
        });

        if (field.args) {
          field.args.forEach(arg => {
            getDirectives(arg).forEach(da => {
              // TODO Again, we may need to pass in the parent field and also
              // possibly the parent type as additional arguments here.
              da.visitArgumentDefinition(arg, {
                field,
                objectType: type,
              });
            });
          });
        }
      });
    }

    // Given a schema type, returns an (often empty) array of directives that
    // should be applied to the given type.
    function getDirectives(type: VisitableType): SchemaDirectiveVisitor[] {
      const directiveInstances: SchemaDirectiveVisitor[] = [];
      const directiveNodes = type.astNode && type.astNode.directives;
      if (! directiveNodes) {
        return directiveInstances;
      }

      directiveNodes.forEach(directiveNode => {
        const name = directiveNode.name.value;
        if (! hasOwn.call(directiveClasses, name)) {
          return;
        }

        const directiveClass = directiveClasses[name];
        const decl = declaredDirectives[name];
        let args: { [key: string]: any };

        if (decl) {
          // If this directive was explicitly declared, use the declared
          // argument types to coerce the argument values properly.
          args = getArgumentValues(decl, directiveNode);
        } else {
          // If this directive was not explicitly declared, just convert the
          // argument nodes to their corresponding JavaScript values.
          args = Object.create(null);
          directiveNode.arguments.forEach(arg => {
            args[arg.name.value] = valueFromASTUntyped(arg.value);
          });
        }

        // As described near the top of the visitSchema method, this is
        // where instances of the SchemaDirectiveVisitor class get created
        // and assigned names.
        directiveInstances.push(
          new directiveClass(name, args, schema)
        );
      });

      return directiveInstances;
    }

    // Kick everything off by visiting the top-level GraphQLSchema object.
    visit(schema);
  }

  // Concrete subclasses of GraphQLSchema directive should override one or more
  // of these visit* methods, in order to express their interest in handling
  // certain types of schema types and/or locations. Much of the complexity of
  // this class (especially the visit helper function above) is necessary to
  // allow these methods to have specific parameter types, rather than something
  // generic like GraphQLNamedType (which isn't even generic enough to handle
  // e.g. GraphQLField<any, any>).

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

  // Make the actual constructor protected to enforce using create.
  protected constructor(
    name: string,
    args: { [key: string]: any },
    schema: GraphQLSchema,
  ) {
    this.name = name;
    this.schema = schema;
    this.args = args;


  }

  // Subclasses of SchemaDirectiveVisitor should override one or more of
  // the visit* methods defined above, and this locations list will be
  // automatically populated with the corresponding DirectiveLocationEnum
  // strings where the directive is allowed to appear. For example, when a
  // subclass overrides the visitUnion method, the "UNION" enum value will
  // be included in this list.
  /* tslint:disable:member-ordering */
  private static locations: DirectiveLocationEnum[] = null;
  public static getLocations() {
    if (this.locations === null) {
      this.locations = [];
      for (let key in this) {
        if (hasOwn.call(methodToLocationMap, key)) {
          const method = this[key];
          if (typeof method === 'function' &&
              ! visitMethodStubSet.has(method)) {
            this.locations.push(methodToLocationMap[key]);
          }
        }
      }
    }
    return this.locations;
  } /* tslint:enable:member-ordering */
}

// Map from visit* method names to corresponding schema locations where
// @directives can appear. Although the visit* methods follow a naming scheme
// directly inspired by the names of DirectiveLocation enum values, meaning we
// could technically populate this mapping automatically, it's not much more
// verbose to write out all the mappings, and that also gives us more
// flexibility in naming them, if that ever becomes important.
const methodToLocationMap: {
  [methodName: string]: DirectiveLocationEnum
} = {
  visitSchema: DirectiveLocation.SCHEMA,
  visitScalar: DirectiveLocation.SCALAR,
  visitObject: DirectiveLocation.OBJECT,
  visitFieldDefinition: DirectiveLocation.FIELD_DEFINITION,
  visitArgumentDefinition: DirectiveLocation.ARGUMENT_DEFINITION,
  visitInterface: DirectiveLocation.INTERFACE,
  visitUnion: DirectiveLocation.UNION,
  visitEnum: DirectiveLocation.ENUM,
  visitEnumValue: DirectiveLocation.ENUM_VALUE,
  visitInputObject: DirectiveLocation.INPUT_OBJECT,
  visitInputFieldDefinition: DirectiveLocation.INPUT_FIELD_DEFINITION,
};

// Used to check that a visit* method is not an empty stub inherited from
// SchemaDirectiveVisitor.prototype.
const visitMethodStubSet = new Set(
  Object.keys(methodToLocationMap).map(
    key => SchemaDirectiveVisitor.prototype[key]
  )
);

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
  default:
    throw new Error('Unexpected value kind: ' + valueNode.kind);
  }
}
