import {
  GraphQLSchema,
  GraphQLFieldResolver,
  GraphQLObjectType,
} from 'graphql';
import {
  IResolvers,
  Operation,
  SubschemaConfig,
} from '../Interfaces';
import delegateToSchema from './delegateToSchema';
import { makeMergedType } from './makeMergedType';

export type Mapping = {
  [typeName: string]: {
    [fieldName: string]: {
      name: string;
      operation: Operation;
    };
  };
};

export function generateProxyingResolvers(
  subschemaConfig: SubschemaConfig,
  createProxyingResolver: (
    schema: GraphQLSchema | SubschemaConfig,
    operation: Operation,
    fieldName: string,
  ) => GraphQLFieldResolver<any, any> = defaultCreateProxyingResolver,
): IResolvers {
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
        [resolverType]: createProxyingResolver(
          subschemaConfig,
          to.operation,
          to.name,
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

function defaultCreateProxyingResolver(
  subschemaConfig: SubschemaConfig,
  operation: Operation,
  fieldName: string,
): GraphQLFieldResolver<any, any> {
  return (parent, args, context, info) => delegateToSchema({
    schema: subschemaConfig,
    operation,
    fieldName,
    args,
    context,
    info,
  });
}

export function stripResolvers(schema: GraphQLSchema): void {
  const typeMap = schema.getTypeMap();
  Object.keys(typeMap).forEach(typeName => {
    if (!typeName.startsWith('__')) {
      makeMergedType(typeMap[typeName]);
    }
  });
}
