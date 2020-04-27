import { buildSchema, GraphQLFieldResolver, GraphQLSchema } from 'graphql';

import {
  IMakeRemoteExecutableSchemaOptions,
  Executor,
  Subscriber,
} from '../Interfaces';
import { delegateToSchema } from '../delegate';

import { wrapSchema } from './wrapSchema';

export function makeRemoteExecutableSchema({
  schema: schemaOrTypeDefs,
  executor,
  subscriber,
  createResolver = defaultCreateRemoteResolver,
  buildSchemaOptions,
}: IMakeRemoteExecutableSchemaOptions): GraphQLSchema {
  const targetSchema =
    typeof schemaOrTypeDefs === 'string'
      ? buildSchema(schemaOrTypeDefs, buildSchemaOptions)
      : schemaOrTypeDefs;

  return wrapSchema({
    schema: targetSchema,
    createProxyingResolver: (_schema, _transforms, _operation) =>
      createResolver(executor, subscriber),
  });
}

export function defaultCreateRemoteResolver(
  executor: Executor,
  subscriber: Subscriber,
): GraphQLFieldResolver<any, any> {
  return (_parent, _args, context, info) =>
    delegateToSchema({
      schema: { schema: info.schema, executor, subscriber },
      context,
      info,
    });
}
