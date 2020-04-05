import {
  GraphQLSchema,
  GraphQLFieldResolver,
  GraphQLObjectType,
} from 'graphql';

import {
  Transform,
  IResolvers,
  Operation,
  SubschemaConfig,
} from '../Interfaces';
import delegateToSchema from '../delegate/delegateToSchema';
import { handleResult } from '../delegate/checkResultAndHandleErrors';

import { makeMergedType } from '../stitch/makeMergedType';
import { getResponseKeyFromInfo } from '../stitch/getResponseKeyFromInfo';
import { getSubschema } from '../stitch/subSchema';
import { getErrors } from '../stitch/errors';

export function generateProxyingResolvers({
  subschemaConfig,
  transforms,
  createProxyingResolver = defaultCreateProxyingResolver,
}: {
  subschemaConfig: SubschemaConfig;
  transforms?: Array<Transform>;
  createProxyingResolver?: ({
    schema,
    transforms,
    operation,
    fieldName,
  }: {
    schema?: GraphQLSchema | SubschemaConfig;
    transforms?: Array<Transform>;
    operation?: Operation;
    fieldName?: string;
  }) => GraphQLFieldResolver<any, any>;
}): IResolvers {
  const targetSchema = subschemaConfig.schema;

  const operationTypes: Record<Operation, GraphQLObjectType> = {
    query: targetSchema.getQueryType(),
    mutation: targetSchema.getMutationType(),
    subscription: targetSchema.getSubscriptionType(),
  };

  const resolvers = {};
  Object.keys(operationTypes).forEach((operation: Operation) => {
    const rootType = operationTypes[operation];
    if (rootType != null) {
      const typeName = rootType.name;
      const fields = rootType.getFields();
      resolvers[typeName] = {};
      Object.keys(fields).forEach((fieldName) => {
        const resolveField =
          operation === 'subscription' ? 'subscribe' : 'resolve';
        resolvers[typeName][fieldName] = {
          [resolveField]: createProxyingResolver({
            schema: subschemaConfig,
            operation,
            fieldName,
            transforms,
          }),
        };
      });
    }
  });

  return resolvers;
}

function defaultCreateProxyingResolver({
  schema,
  transforms,
}: {
  schema: SubschemaConfig;
  transforms: Array<Transform>;
}): GraphQLFieldResolver<any, any> {
  return (parent, _args, context, info) => {
    if (parent != null) {
      const responseKey = getResponseKeyFromInfo(info);
      const errors = getErrors(parent, responseKey);

      // Check to see if the parent contains a proxied result
      if (errors != null) {
        const subschema = getSubschema(parent, responseKey);

        // If there is a proxied result from this subschema, return it
        // This can happen even for a root field when the root type ia
        // also nested as a field within a different type.
        if (schema === subschema) {
          return handleResult(
            parent[responseKey],
            errors,
            subschema,
            context,
            info,
          );
        }
      }
    }

    return delegateToSchema({
      schema,
      context,
      info,
      transforms,
    });
  };
}

export function stripResolvers(schema: GraphQLSchema): void {
  const typeMap = schema.getTypeMap();
  Object.keys(typeMap).forEach((typeName) => {
    if (!typeName.startsWith('__')) {
      makeMergedType(typeMap[typeName]);
    }
  });
}
