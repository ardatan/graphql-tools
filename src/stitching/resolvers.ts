import {
  GraphQLSchema,
  GraphQLFieldResolver,
  GraphQLObjectType,
} from 'graphql';
import { IResolvers, Operation } from '../Interfaces';
import delegateToSchema from './delegateToSchema';
import { Transform } from '../transforms/index';

export type Mapping = {
  [typeName: string]: {
    [fieldName: string]: {
      name: string;
      operation: Operation;
    };
  };
};

export function generateProxyingResolvers(
  targetSchema: GraphQLSchema,
  transforms: Array<Transform>,
  mapping: Mapping,
): IResolvers {
  const result = {};
  Object.keys(mapping).forEach(name => {
    result[name] = {};
    const innerMapping = mapping[name];
    Object.keys(innerMapping).forEach(from => {
      const to = innerMapping[from];
      const resolverType =
        to.operation === 'subscription' ? 'subscribe' : 'resolve';
      result[name][from] = {
        [resolverType]: createProxyingResolver(
          targetSchema,
          to.operation,
          to.name,
          transforms,
        ),
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
  if (query) {
    result[query.name] = generateMappingFromObjectType(query, 'query');
  }
  if (mutation) {
    result[mutation.name] = generateMappingFromObjectType(mutation, 'mutation');
  }
  if (subscription) {
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

function createProxyingResolver(
  schema: GraphQLSchema,
  operation: Operation,
  fieldName: string,
  transforms: Array<Transform>,
): GraphQLFieldResolver<any, any> {
  return (parent, args, context, info) => delegateToSchema({
    schema,
    operation,
    fieldName,
    args: {},
    context,
    info,
    transforms,
  });
}
