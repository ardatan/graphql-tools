import {
  GraphQLSchema,
  GraphQLFieldResolver,
  GraphQLObjectType,
} from 'graphql';

import { IResolvers, Operation, SubschemaConfig } from '../Interfaces';
import { Transform } from '../transforms';

import delegateToSchema from './delegateToSchema';
import { makeMergedType } from './makeMergedType';
import { getResponseKeyFromInfo } from './getResponseKeyFromInfo';
import { getErrors, getSubschema } from './proxiedResult';
import { handleResult } from './checkResultAndHandleErrors';

export type Mapping = {
  [typeName: string]: {
    [fieldName: string]: {
      name: string;
      operation: Operation;
    };
  };
};

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

  const mapping = generateSimpleMapping(targetSchema);

  const result = {};
  Object.keys(mapping).forEach(name => {
    result[name] = {};
    const innerMapping = mapping[name];
    Object.keys(innerMapping).forEach(from => {
      const to = innerMapping[from];
      const resolverType =
        to.operation === 'subscription' ? 'subscribe' : 'resolve';
      result[name][from] = {
        [resolverType]: createProxyingResolver({
          schema: subschemaConfig,
          transforms,
          operation: to.operation,
          fieldName: to.name,
        }),
      };
    });
  });
  return result;
}

export function generateSimpleMapping(targetSchema: GraphQLSchema): Mapping {
  const query = targetSchema.getQueryType();
  const mutation = targetSchema.getMutationType();
  const subscription = targetSchema.getSubscriptionType();

  const result: Mapping = {};
  if (query != null) {
    result[query.name] = generateMappingFromObjectType(query, 'query');
  }
  if (mutation != null) {
    result[mutation.name] = generateMappingFromObjectType(mutation, 'mutation');
  }
  if (subscription != null) {
    result[subscription.name] = generateMappingFromObjectType(
      subscription,
      'subscription',
    );
  }

  return result;
}

export function generateMappingFromObjectType(
  type: GraphQLObjectType,
  operation: Operation,
): {
  [fieldName: string]: {
    name: string;
    operation: Operation;
  };
} {
  const result = {};
  const fields = type.getFields();
  Object.keys(fields).forEach(fieldName => {
    result[fieldName] = {
      name: fieldName,
      operation,
    };
  });
  return result;
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

      // check to see if parent is a proxied result, possible if root types are also nested
      if (errors != null) {
        const result = parent[responseKey];
        const subschema = getSubschema(parent, responseKey);

        return handleResult(result, errors, subschema, context, info);
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
  Object.keys(typeMap).forEach(typeName => {
    if (!typeName.startsWith('__')) {
      makeMergedType(typeMap[typeName]);
    }
  });
}
