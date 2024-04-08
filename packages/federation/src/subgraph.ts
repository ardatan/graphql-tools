import {
  GraphQLResolveInfo,
  Kind,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
  visit,
} from 'graphql';
import { ValueOrPromise } from 'value-or-promise';
import { Resolvers } from '@apollo/client';
import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge';
import { IExecutableSchemaDefinition, makeExecutableSchema } from '@graphql-tools/schema';
import { printSchemaWithDirectives, TypeSource } from '@graphql-tools/utils';

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

export function buildSubgraphSchema<TContext = any>(
  optsOrModules:
    | IExecutableSchemaDefinition<TContext>
    | Pick<IExecutableSchemaDefinition<TContext>, 'typeDefs' | 'resolvers'>[],
) {
  const opts = Array.isArray(optsOrModules)
    ? {
        typeDefs: optsOrModules.map(opt => opt.typeDefs),
        resolvers: optsOrModules.map(opt => opt.resolvers).flat(),
      }
    : optsOrModules;
  const entityTypeNames: string[] = [];
  function handleEntity(node: ObjectTypeExtensionNode | ObjectTypeDefinitionNode) {
    if (node.directives?.some(directive => directive.name.value === 'key')) {
      entityTypeNames.push(node.name.value);
    }
  }
  const typeDefs = visit(mergeTypeDefs([SubgraphBaseSDL, opts.typeDefs]), {
    ObjectTypeDefinition: node => {
      handleEntity(node);
    },
    ObjectTypeExtension: node => {
      handleEntity(node);
      return {
        ...node,
        kind: Kind.OBJECT_TYPE_DEFINITION,
        directives: [
          ...(node.directives || []),
          {
            kind: 'Directive',
            name: {
              kind: 'Name',
              value: 'extends',
            },
          },
        ],
      };
    },
  });

  const givenResolvers: any = mergeResolvers(opts.resolvers);

  const allTypeDefs: TypeSource[] = [typeDefs];
  const allResolvers: Resolvers[] = [sdlResolvers, givenResolvers];

  if (entityTypeNames.length > 0) {
    allTypeDefs.push(`union _Entity = ${entityTypeNames.join(' | ')}`);
    allTypeDefs.push(`extend type Query {
      _entities(representations: [_Any!]!): [_Entity]!
    }`);
    allResolvers.push({
      _Entity: {
        __resolveType: entityTypeResolver,
      },
      Query: {
        _entities: (_root: any, args: { representations: any[] }, context: TContext, info: any) =>
          ValueOrPromise.all(
            args.representations.map(representation =>
              new ValueOrPromise(() =>
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
      },
    });
  }
  return makeExecutableSchema({
    assumeValid: true,
    assumeValidSDL: true,
    ...opts,
    typeDefs: allTypeDefs,
    resolvers: allResolvers,
  });
}

function entityTypeResolver(obj: { __typename: string }) {
  return obj.__typename;
}

const sdlResolvers = {
  Query: {
    _service: () => ({}),
  },
  _Service: {
    sdl: (_root: never, _args: never, _context: any, info: GraphQLResolveInfo) =>
      printSchemaWithDirectives(info.schema),
  },
};
