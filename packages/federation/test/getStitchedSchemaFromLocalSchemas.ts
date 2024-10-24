import { GraphQLSchema } from 'graphql';
import { kebabCase } from 'lodash';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { ExecutionRequest, ExecutionResult, isPromise } from '@graphql-tools/utils';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';

export interface LocalSchemaItem {
  name: string;
  schema: GraphQLSchema;
}

export async function getStitchedSchemaFromLocalSchemas(
  localSchemas: Record<string, GraphQLSchema>,
  onSubgraphExecute?: (
    subgraph: string,
    executionRequest: ExecutionRequest,
    result: ExecutionResult | AsyncIterable<ExecutionResult>,
  ) => void,
): Promise<GraphQLSchema> {
  const { IntrospectAndCompose, LocalGraphQLDataSource } = await import('@apollo/gateway');
  const introspectAndCompose = await new IntrospectAndCompose({
    subgraphs: Object.keys(localSchemas).map(name => ({ name, url: 'http://localhost/' + name })),
  }).initialize({
    healthCheck() {
      return Promise.resolve();
    },
    update() {},
    getDataSource({ name }) {
      const [, localSchema] =
        Object.entries(localSchemas).find(([key]) => kebabCase(key) === kebabCase(name)) || [];
      if (localSchema) {
        return new LocalGraphQLDataSource(localSchema);
      }
      throw new Error(`Unknown subgraph ${name}`);
    },
  });
  function createTracedExecutor(name: string, schema: GraphQLSchema) {
    const executor = createDefaultExecutor(schema);
    return function tracedExecutor(request: ExecutionRequest) {
      const result = executor(request);
      if (onSubgraphExecute) {
        if (isPromise(result)) {
          return result.then(result => {
            onSubgraphExecute(name, request, result);
            return result;
          });
        }
        onSubgraphExecute(name, request, result);
      }
      return result;
    };
  }
  return getStitchedSchemaFromSupergraphSdl({
    supergraphSdl: introspectAndCompose.supergraphSdl,
    onSubschemaConfig(subschemaConfig) {
      const [name, localSchema] =
        Object.entries(localSchemas).find(
          ([key]) => kebabCase(key) === kebabCase(subschemaConfig.name),
        ) || [];
      if (name && localSchema) {
        subschemaConfig.executor = createTracedExecutor(name, localSchema);
      } else {
        throw new Error(`Unknown subgraph ${subschemaConfig.name}`);
      }
    },
  });
}
