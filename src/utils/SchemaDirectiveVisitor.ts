import {
  GraphQLDirective,
  GraphQLSchema,
  DirectiveLocationEnum,
  TypeSystemExtensionNode,
} from 'graphql';
import { getArgumentValues } from 'graphql/execution/values';

import { VisitableSchemaType } from '../Interfaces';

import each from './each';
import valueFromASTUntyped from './valueFromASTUntyped';
import { SchemaVisitor } from './SchemaVisitor';
import { visitSchema } from './visitSchema';

const hasOwn = Object.prototype.hasOwnProperty;

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

export class SchemaDirectiveVisitor<
  TArgs = { [name: string]: any },
  TContext = { [key: string]: any }
> extends SchemaVisitor {
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
  public args: TArgs;

  // A reference to the type object that this visitor was created to visit.
  public visitedType: VisitableSchemaType;

  // A shared object that will be available to all visitor instances via
  // this.context. Callers of visitSchemaDirectives can provide their own
  // object, or just use the default empty object.
  public context: TContext;

  // Override this method to return a custom GraphQLDirective (or modify one
  // already present in the schema) to enforce argument types, provide default
  // argument values, or specify schema locations where this @directive may
  // appear. By default, any declaration found in the schema will be returned.
  public static getDirectiveDeclaration(
    directiveName: string,
    schema: GraphQLSchema,
  ): GraphQLDirective | null | undefined {
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
      [directiveName: string]: typeof SchemaDirectiveVisitor;
    },
    // Optional context object that will be available to all visitor instances
    // via this.context. Defaults to an empty null-prototype object.
    context: {
      [key: string]: any;
    } = Object.create(null),
  ): {
    // The visitSchemaDirectives method returns a map from directive names to
    // lists of SchemaDirectiveVisitors created while visiting the schema.
    [directiveName: string]: Array<SchemaDirectiveVisitor>;
  } {
    // If the schema declares any directives for public consumption, record
    // them here so that we can properly coerce arguments when/if we encounter
    // an occurrence of the directive while walking the schema below.
    const declaredDirectives = this.getDeclaredDirectives(
      schema,
      directiveVisitors,
    );

    // Map from directive names to lists of SchemaDirectiveVisitor instances
    // created while visiting the schema.
    const createdVisitors: {
      [directiveName: string]: Array<SchemaDirectiveVisitor>;
    } = Object.create(null);
    Object.keys(directiveVisitors).forEach((directiveName) => {
      createdVisitors[directiveName] = [];
    });

    function visitorSelector(
      type: VisitableSchemaType,
      methodName: string,
    ): Array<SchemaDirectiveVisitor> {
      let directiveNodes = type.astNode != null ? type.astNode.directives : [];

      const extensionASTNodes: ReadonlyArray<TypeSystemExtensionNode> = (type as {
        extensionASTNodes?: Array<TypeSystemExtensionNode>;
      }).extensionASTNodes;

      if (extensionASTNodes != null) {
        extensionASTNodes.forEach((extensionASTNode) => {
          directiveNodes = directiveNodes.concat(extensionASTNode.directives);
        });
      }

      const visitors: Array<SchemaDirectiveVisitor> = [];
      directiveNodes.forEach((directiveNode) => {
        const directiveName = directiveNode.name.value;
        if (!hasOwn.call(directiveVisitors, directiveName)) {
          return;
        }

        const visitorClass = directiveVisitors[directiveName];

        // Avoid creating visitor objects if visitorClass does not override
        // the visitor method named by methodName.
        if (!visitorClass.implementsVisitorMethod(methodName)) {
          return;
        }

        const decl = declaredDirectives[directiveName];
        let args: { [key: string]: any };

        if (decl != null) {
          // If this directive was explicitly declared, use the declared
          // argument types (and any default values) to check, coerce, and/or
          // supply default values for the given arguments.
          args = getArgumentValues(decl, directiveNode);
        } else {
          // If this directive was not explicitly declared, just convert the
          // argument nodes to their corresponding JavaScript values.
          args = Object.create(null);
          if (directiveNode.arguments != null) {
            directiveNode.arguments.forEach((arg) => {
              args[arg.name.value] = valueFromASTUntyped(arg.value);
            });
          }
        }

        // As foretold in comments near the top of the visitSchemaDirectives
        // method, this is where instances of the SchemaDirectiveVisitor class
        // get created and assigned names. While subclasses could override the
        // constructor method, the constructor is marked as protected, so
        // these are the only arguments that will ever be passed.
        visitors.push(
          new visitorClass({
            name: directiveName,
            args,
            visitedType: type,
            schema,
            context,
          }),
        );
      });

      if (visitors.length > 0) {
        visitors.forEach((visitor) => {
          createdVisitors[visitor.name].push(visitor);
        });
      }

      return visitors;
    }

    visitSchema(schema, visitorSelector);

    return createdVisitors;
  }

  protected static getDeclaredDirectives(
    schema: GraphQLSchema,
    directiveVisitors: {
      [directiveName: string]: typeof SchemaDirectiveVisitor;
    },
  ) {
    const declaredDirectives: {
      [directiveName: string]: GraphQLDirective;
    } = Object.create(null);

    each(schema.getDirectives(), (decl: GraphQLDirective) => {
      declaredDirectives[decl.name] = decl;
    });

    // If the visitor subclass overrides getDirectiveDeclaration, and it
    // returns a non-null GraphQLDirective, use that instead of any directive
    // declared in the schema itself. Reasoning: if a SchemaDirectiveVisitor
    // goes to the trouble of implementing getDirectiveDeclaration, it should
    // be able to rely on that implementation.
    each(directiveVisitors, (visitorClass, directiveName) => {
      const decl = visitorClass.getDirectiveDeclaration(directiveName, schema);
      if (decl != null) {
        declaredDirectives[directiveName] = decl;
      }
    });

    each(declaredDirectives, (decl, name) => {
      if (!hasOwn.call(directiveVisitors, name)) {
        // SchemaDirectiveVisitors.visitSchemaDirectives might be called
        // multiple times with partial directiveVisitors maps, so it's not
        // necessarily an error for directiveVisitors to be missing an
        // implementation of a directive that was declared in the schema.
        return;
      }
      const visitorClass = directiveVisitors[name];

      each(decl.locations, (loc) => {
        const visitorMethodName = directiveLocationToVisitorMethodName(loc);
        if (
          SchemaVisitor.implementsVisitorMethod(visitorMethodName) &&
          !visitorClass.implementsVisitorMethod(visitorMethodName)
        ) {
          // While visitor subclasses may implement extra visitor methods,
          // it's definitely a mistake if the GraphQLDirective declares itself
          // applicable to certain schema locations, and the visitor subclass
          // does not implement all the corresponding methods.
          throw new Error(
            `SchemaDirectiveVisitor for @${name} must implement ${visitorMethodName} method`,
          );
        }
      });
    });

    return declaredDirectives;
  }

  // Mark the constructor protected to enforce passing SchemaDirectiveVisitor
  // subclasses (not instances) to visitSchemaDirectives.
  protected constructor(config: {
    name: string;
    args: TArgs;
    visitedType: VisitableSchemaType;
    schema: GraphQLSchema;
    context: TContext;
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
  return (
    'visit' +
    loc.replace(
      /([^_]*)_?/g,
      (_wholeMatch, part: string) =>
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
  );
}
