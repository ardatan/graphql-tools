import {
  GraphQLSchema,
  GraphQLFieldResolver,
  GraphQLObjectType,
} from 'graphql';
import {
  IResolvers,
  Operation,
  SchemaExecutionConfig,
  isSchemaExecutionConfig,
} from '../Interfaces';
import delegateToSchema from './delegateToSchema';
import { makeMergedType } from './makeMergedType';
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
  schemaOrSchemaExecutionConfig: GraphQLSchema | SchemaExecutionConfig,
  transforms: Array<Transform> = [],
  createProxyingResolver: (
    schema: GraphQLSchema | SchemaExecutionConfig,
    operation: Operation,
    fieldName: string,
    transforms: Array<Transform>,
  ) => GraphQLFieldResolver<any, any> = defaultCreateProxyingResolver,
): IResolvers {
  const targetSchema: GraphQLSchema = isSchemaExecutionConfig(schemaOrSchemaExecutionConfig) ?
    schemaOrSchemaExecutionConfig.schema : schemaOrSchemaExecutionConfig;

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

function defaultCreateProxyingResolver(
  schema: GraphQLSchema | SchemaExecutionConfig,
  operation: Operation,
  fieldName: string,
  transforms: Array<Transform>,
): GraphQLFieldResolver<any, any> {
  return (parent, args, context, info) => delegateToSchema({
    schema,
    operation,
    fieldName,
    args,
    context,
    info,
    transforms,
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
