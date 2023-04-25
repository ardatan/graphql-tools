import { createDefaultExecutor, SubschemaConfig } from '@graphql-tools/delegate';
import { buildHTTPExecutor, HTTPExecutorOptions } from '@graphql-tools/executor-http';
import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge';
import { IExecutableSchemaDefinition, makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas, SubschemaConfigTransform } from '@graphql-tools/stitch';
import {
  AsyncExecutor,
  ExecutionResult,
  Executor,
  getDocumentNodeFromSchema,
  printSchemaWithDirectives,
} from '@graphql-tools/utils';
import {
  buildASTSchema,
  concatAST,
  DocumentNode,
  FieldDefinitionNode,
  GraphQLResolveInfo,
  GraphQLSchema,
  Kind,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
  parse,
  visit,
} from 'graphql';
import { ValueOrPromise } from 'value-or-promise';

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
  directive @link(url: String!, as: String, for: link__Purpose, import: [link__Import]) repeatable on SCHEMA
  directive @shareable repeatable on OBJECT | FIELD_DEFINITION
  directive @inaccessible on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
  directive @tag(
    name: String!
  ) repeatable on FIELD_DEFINITION | INTERFACE | OBJECT | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
  directive @override(from: String!) on FIELD_DEFINITION
  directive @composeDirective(name: String!) repeatable on SCHEMA

  directive @extends on OBJECT | INTERFACE
`;

export const SubgraphSDLQuery = /* GraphQL */ `
  query SubgraphSDL {
    _service {
      sdl
    }
  }
`;

function getArgsFromKeysForFederation(representations: readonly any[]) {
  return { representations };
}

function getKeyForFederation(root: any) {
  return root;
}

export function getSubschemaForFederationWithURL(config: HTTPExecutorOptions): Promise<SubschemaConfig> {
  const executor = buildHTTPExecutor(config as any) as AsyncExecutor;
  return getSubschemaForFederationWithExecutor(executor);
}

export function getSubschemaForFederationWithTypeDefs(typeDefs: DocumentNode): SubschemaConfig {
  const subschemaConfig = {} as SubschemaConfig;
  const typeMergingConfig = (subschemaConfig.merge = subschemaConfig.merge || {});
  const entityTypes: string[] = [];
  const visitor = (node: ObjectTypeDefinitionNode | ObjectTypeExtensionNode) => {
    if (node.directives) {
      const typeName = node.name.value;
      const selections: string[] = [];
      for (const directive of node.directives) {
        const directiveArgs = directive.arguments || [];
        switch (directive.name.value) {
          case 'key': {
            if (
              directiveArgs.some(
                arg => arg.name.value === 'resolvable' && arg.value.kind === Kind.BOOLEAN && arg.value.value === false
              )
            ) {
              continue;
            }
            const selectionValueNode = directiveArgs.find(arg => arg.name.value === 'fields')?.value;
            if (selectionValueNode?.kind === Kind.STRING) {
              selections.push(selectionValueNode.value);
            }
            break;
          }
          case 'inaccessible':
            return null;
        }
      }
      // If it is not an entity, continue
      if (selections.length === 0) {
        return node;
      }
      const typeMergingTypeConfig = (typeMergingConfig[typeName] = typeMergingConfig[typeName] || {});
      if (node.kind === Kind.OBJECT_TYPE_DEFINITION && !node.directives?.some(d => d.name.value === 'extends')) {
        typeMergingTypeConfig.canonical = true;
      }
      entityTypes.push(typeName);
      typeMergingTypeConfig.selectionSet = `{ ${selections.join(' ')} }`;
      typeMergingTypeConfig.key = getKeyForFederation;
      typeMergingTypeConfig.argsFromKeys = getArgsFromKeysForFederation;
      typeMergingTypeConfig.fieldName = `_entities`;
      const fields = [];
      if (node.fields) {
        for (const fieldNode of node.fields) {
          let removed = false;
          if (fieldNode.directives) {
            const fieldName = fieldNode.name.value;
            for (const directive of fieldNode.directives) {
              const directiveArgs = directive.arguments || [];
              switch (directive.name.value) {
                case 'requires': {
                  const typeMergingFieldsConfig = (typeMergingTypeConfig.fields = typeMergingTypeConfig.fields || {});
                  typeMergingFieldsConfig[fieldName] = typeMergingFieldsConfig[fieldName] || {};
                  if (
                    directiveArgs.some(
                      arg =>
                        arg.name.value === 'resolvable' && arg.value.kind === Kind.BOOLEAN && arg.value.value === false
                    )
                  ) {
                    continue;
                  }
                  const selectionValueNode = directiveArgs.find(arg => arg.name.value === 'fields')?.value;
                  if (selectionValueNode?.kind === Kind.STRING) {
                    typeMergingFieldsConfig[fieldName].selectionSet = `{ ${selectionValueNode.value} }`;
                    typeMergingFieldsConfig[fieldName].computed = true;
                  }
                  break;
                }
                case 'external':
                case 'inaccessible': {
                  removed = !typeMergingTypeConfig.selectionSet?.includes(` ${fieldName} `);
                  break;
                }
                case 'override': {
                  const typeMergingFieldsConfig = (typeMergingTypeConfig.fields = typeMergingTypeConfig.fields || {});
                  typeMergingFieldsConfig[fieldName] = typeMergingFieldsConfig[fieldName] || {};
                  typeMergingFieldsConfig[fieldName].canonical = true;
                  break;
                }
              }
            }
          }
          if (!removed) {
            fields.push(fieldNode);
          }
        }
        (node.fields as FieldDefinitionNode[]) = fields;
      }
    }
    return {
      ...node,
      kind: Kind.OBJECT_TYPE_DEFINITION,
    };
  };
  const parsedSDL = visit(typeDefs, {
    ObjectTypeExtension: visitor,
    ObjectTypeDefinition: visitor,
  });
  subschemaConfig.schema = buildASTSchema(
    concatAST([parse(`union _Entity = ${entityTypes.join(' | ')}` + SubgraphBaseSDL), parsedSDL]),
    {
      assumeValidSDL: true,
      assumeValid: true,
    }
  );
  subschemaConfig.batch = true;
  return subschemaConfig;
}

export async function getSubschemaForFederationWithExecutor(executor: Executor) {
  const sdlQueryResult = (await executor({
    document: parse(SubgraphSDLQuery),
  })) as ExecutionResult;
  const typeDefs = parse(sdlQueryResult.data._service.sdl);

  const subschemaConfig = getSubschemaForFederationWithTypeDefs(typeDefs);
  return {
    ...subschemaConfig,
    executor,
  };
}

export async function getSubschemaForFederationWithSchema(schema: GraphQLSchema) {
  const executor = createDefaultExecutor(schema);
  return getSubschemaForFederationWithExecutor(executor);
}

export async function getStitchedSchemaWithUrls(configs: HTTPExecutorOptions[]) {
  const subschemas = await Promise.all(configs.map(config => getSubschemaForFederationWithURL(config)));
  return stitchSchemas({
    subschemas,
  });
}

export const federationSubschemaTransformer: SubschemaConfigTransform = function federationSubschemaTransformer(
  subschemaConfig: SubschemaConfig
): SubschemaConfig {
  const typeDefs = getDocumentNodeFromSchema(subschemaConfig.schema);
  const newSubschema = getSubschemaForFederationWithTypeDefs(typeDefs);
  return {
    ...subschemaConfig,
    ...newSubschema,
    merge: {
      ...newSubschema.merge,
      ...subschemaConfig.merge,
    },
  };
};

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
      _entities: (_root: never, args: { representations: any[] }, context: TContext, info: GraphQLResolveInfo) =>
        ValueOrPromise.all(
          args.representations.map(representation =>
            new ValueOrPromise(() =>
              givenResolvers[representation.__typename]?.__resolveReference?.(representation, context, info)
            ).then(resolvedEntity => ({
              ...representation,
              ...resolvedEntity,
            }))
          )
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
