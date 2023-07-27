import { GraphQLResolveInfo, visit } from 'graphql';
import { ValueOrPromise } from 'value-or-promise';
import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge';
import { IExecutableSchemaDefinition, makeExecutableSchema } from '@graphql-tools/schema';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

export const SubgraphBaseSDL = /* GraphQL */ `
  scalar _Any
  scalar _FieldSet
  scalar link__Import

  enum link__Purpose {
    SECURITY
    EXECUTION
  }

  type _Service {
    sdl: String!
  }

  type Query {
    _entities(representations: [_Any!]!): [_Entity]!
    _service: _Service!
  }

  directive @external on FIELD_DEFINITION | OBJECT
  directive @requires(fields: _FieldSet!) on FIELD_DEFINITION
  directive @provides(fields: _FieldSet!) on FIELD_DEFINITION
  directive @key(fields: _FieldSet!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE
  directive @link(
    url: String!
    as: String
    for: link__Purpose
    import: [link__Import]
  ) repeatable on SCHEMA
  directive @shareable repeatable on OBJECT | FIELD_DEFINITION
  directive @inaccessible on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
  directive @tag(
    name: String!
  ) repeatable on FIELD_DEFINITION | INTERFACE | OBJECT | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
  directive @override(from: String!) on FIELD_DEFINITION
  directive @composeDirective(name: String!) repeatable on SCHEMA

  directive @extends on OBJECT | INTERFACE
`;

export function buildSubgraphSchema<TContext = any>(opts: IExecutableSchemaDefinition<TContext>) {
  const typeDefs = mergeTypeDefs([SubgraphBaseSDL, opts.typeDefs]);
  const entityTypeNames: string[] = [];
  visit(typeDefs, {
    ObjectTypeDefinition: node => {
      if (node.directives?.some(directive => directive.name.value === 'key')) {
        entityTypeNames.push(node.name.value);
      }
    },
  });
  const entityTypeDefinition = `union _Entity = ${entityTypeNames.join(' | ')}`;
  const givenResolvers: any = mergeResolvers(opts.resolvers);
  const subgraphResolvers = {
    _Entity: {
      __resolveType: (obj: { __typename: string }) => obj.__typename,
    },
    Query: {
      _entities: (
        _root: never,
        args: { representations: any[] },
        context: TContext,
        info: GraphQLResolveInfo,
      ) =>
        ValueOrPromise.all(
          args.representations.map(representation =>
            new ValueOrPromise(
              () =>
                givenResolvers[representation.__typename]?.__resolveReference?.(
                  representation,
                  context,
                  info,
                ),
            ).then(resolvedEntity => {
              if (!resolvedEntity) {
                return representation;
              }
              if (!resolvedEntity.__typename) {
                resolvedEntity.__typename = representation.__typename;
              }
              return resolvedEntity;
            }),
          ),
        ).resolve(),
      _service: () => ({}),
    },
    _Service: {
      sdl: (_root: never, _args: never, _context: TContext, info: GraphQLResolveInfo) =>
        printSchemaWithDirectives(info.schema),
    },
  };
  return makeExecutableSchema({
    assumeValid: true,
    assumeValidSDL: true,
    ...opts,
    typeDefs: [entityTypeDefinition, typeDefs],
    resolvers: [subgraphResolvers, givenResolvers],
  });
}
