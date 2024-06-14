import { GraphQLSchema, parse } from 'graphql';
import { IntrospectAndCompose, LocalGraphQLDataSource } from '@apollo/gateway';
import { buildSubgraphSchema as apolloBuildSubgraphSchema } from '@apollo/subgraph';
import { IResolvers } from '@graphql-tools/utils';
import * as accounts from './accounts';
import * as discount from './discount';
import * as inventory from './inventory';
import * as products from './products';
import * as reviews from './reviews';

const services = {
  accounts,
  discount,
  inventory,
  products,
  reviews,
} as const;

export interface ServiceInput {
  name: string;
  typeDefs: string;
  schema: GraphQLSchema;
}

export type BuildSubgraphSchemaFn = (options: {
  typeDefs: string;
  resolvers: IResolvers;
}) => GraphQLSchema;

const defaultBuildSubgraphSchema: BuildSubgraphSchemaFn = ({ typeDefs, resolvers }) =>
  apolloBuildSubgraphSchema({
    typeDefs: parse(typeDefs, { noLocation: true }),
    resolvers: resolvers as {},
  });

export function getServiceInputs(
  buildSubgraphSchema: BuildSubgraphSchemaFn = defaultBuildSubgraphSchema,
) {
  return Object.entries(services).map(([name, module]) => ({
    name,
    typeDefs: module.typeDefs,
    schema: buildSubgraphSchema(module),
  }));
}

export async function getSupergraph(
  buildSubgraphSchema: BuildSubgraphSchemaFn = defaultBuildSubgraphSchema,
) {
  const serviceInputs = getServiceInputs(buildSubgraphSchema);
  const { supergraphSdl, cleanup } = await new IntrospectAndCompose({
    subgraphs: serviceInputs.map(({ name }) => ({ name, url: `http://localhost/${name}` })),
  }).initialize({
    update() {},
    async healthCheck() {},
    getDataSource({ name }) {
      const serviceInput = serviceInputs.find(input => input.name === name);
      if (!serviceInput) {
        throw new Error(`Service ${name} not found`);
      }
      return new LocalGraphQLDataSource(serviceInput.schema);
    },
  });
  await cleanup();
  return supergraphSdl;
}
