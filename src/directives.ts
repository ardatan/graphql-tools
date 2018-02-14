import {
  DirectiveLocation,
  DirectiveLocationEnum,
  GraphQLArgument,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLEnumValue,
  GraphQLField,
  GraphQLFieldConfigArgumentMap,
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

export class GraphQLSchemaDirective extends GraphQLDirective {
  // Subclasses of GraphQLSchemaDirective should define their own static
  // .description property, which will be passed to the GraphQLDirective
  // constructor by the static create method.
  public static description: string;

  // All GraphQLSchemaDirective instances are created while visiting a
  // specific GraphQLSchema object, and this property holds a reference to
  // that object.
  public schema: GraphQLSchema;

  // Although you might think a GraphQLSchemaDirective subclass should also
  // define an appropriate static .name property, that turns out not to be
  // necessary, since the names of directives will be provided as keys of the
  // directiveClasses object passed to visitSchema. In other words, directive
  // implementations are effectively anonymous, and it's up to the caller of
  // GraphQLSchemaDirective.visitSchema to assign names to them.

  // Call GraphQLSchemaDirective.visitSchema(schema, directiveClasses) to
  // visit every @directive in the schema and instantiate an appropriate
  // GraphQLSchemaDirective subclass to visit/handle/transform the object
  // decorated by the @directive.
  public static visitSchema(
    schema: GraphQLSchema,
    directiveClasses: {
      // Because a new GraphQLSchemaDirective class will be instantiated each
      // time a specific directive is found in the schema AST, callers of the
      // visitSchema method should provide GraphQLSchemaDirective sub*classes*
      // rather than instances as the values in this object. The keys of the
      // object correspond to directive names as they appear in the schema.
      [name: string]: typeof GraphQLSchemaDirective
    },
  ) {
    // If the schema declares any directives for public consumption, collect
    // them here so that we can coerce the arguments when/if we encounter an
    // instance of the directive while walking the schema below.
    const declaredDirectives = Object.create(null);
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
            df.visitInputFieldDefinition(field);
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
        // syntax for union member types, so there's no point visiting them
        // here. That's a blessing in disguise, really, because the types
        // returned from type.getTypes() are references to GraphQLObjectType
        // objects defined elsewhere in the schema, which might already have
        // directives of their own, so it would be tricky to prevent this loop
        // from re-visiting those directives. If you really need to access the
        // member types of a union, just implement a GraphQLSchemaDirective that
        // overrides visitUnion, and call unionType.getTypes() yourself.

        // type.getTypes().forEach(visit);

      } else if (type instanceof GraphQLEnumType) {
        getDirectives(type).forEach(d => {
          d.visitEnum(type);
        });

        type.getValues().forEach(value => {
          getDirectives(value).forEach(dv => {
            dv.visitEnumValue(value);
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
          df.visitFieldDefinition(field);
        });

        if (field.args) {
          field.args.forEach(arg => {
            getDirectives(arg).forEach(da => {
              // TODO Again, we may need to pass in the parent field and also
              // possibly the parent type as additional arguments here.
              da.visitArgumentDefinition(arg);
            });
          });
        }
      });
    }

    // Given a schema type, returns an (often empty) array of directives that
    // should be applied to the given type.
    function getDirectives(type: VisitableType): GraphQLSchemaDirective[] {
      const directiveInstances: GraphQLSchemaDirective[] = [];
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

        // As described near the top of the visitSchema method, this is where
        // instances of the GraphQLSchemaDirective class get created and
        // assigned names.
        directiveInstances.push(
          directiveClass.create(name, args, schema)
        );
      });

      return directiveInstances;
    }

    // Kick everything off by visiting the top-level GraphQLSchema object.
    visit(schema);
  }

  // The constructor method cannot access static members like .description
  // because TypeScript doesn't understand this.constructor.description, and
  // GraphQLSchemaDirective.description would be wrong for subclasses. Instead
  // we define an inheritable static create method that returns new instances of
  // whatever subclass this is.
  public static create(
    name: string,
    args: GraphQLFieldConfigArgumentMap,
    schema: GraphQLSchema,
  ) {
    return new this(
      name,
      this.description || ('@' + name),
      args,
      schema,
    );
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
  public visitFieldDefinition(field: GraphQLField<any, any>) {}
  public visitArgumentDefinition(argument: GraphQLArgument) {}
  public visitInterface(iface: GraphQLInterfaceType) {}
  public visitUnion(union: GraphQLUnionType) {}
  public visitEnum(type: GraphQLEnumType) {}
  public visitEnumValue(value: GraphQLEnumValue) {}
  public visitInputObject(object: GraphQLInputObjectType) {}
  public visitInputFieldDefinition(field: GraphQLInputField) {}
  /* tslint:enable:no-empty */

  // Make the actual constructor protected to enforce using create.
  protected constructor(
    name: string,
    description: string,
    args: GraphQLFieldConfigArgumentMap,
    schema: GraphQLSchema,
  ) {
    super({
      name,
      description,
      args,
      locations: [],
    });

    // In case visitor methods need to access the schema object.
    this.schema = schema;

    // MAGIC: Subclasses do not have to specify an array of DirectiveLocation
    // values, because we can figure out the appropriate locations simply by
    // inspecting the visit* methods that are defined by this class.
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
// GraphQLSchemaDirective.prototype.
const visitMethodStubSet = new Set(
  Object.keys(methodToLocationMap).map(
    key => GraphQLSchemaDirective.prototype[key]
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
