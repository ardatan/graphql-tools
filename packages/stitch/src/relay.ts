import { MergedTypeConfig, SubschemaConfig } from '@graphql-tools/delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { isInterfaceType } from 'graphql';

const defaultRelayMergeConfig: MergedTypeConfig = {
  selectionSet: `{ id }`,
  fieldName: 'node',
  args: ({ id }: any) => ({ id }),
};

export function handleRelaySubschemas(subschemas: SubschemaConfig[], getTypeNameFromId: (id: string) => string) {
  const typeNames: string[] = [];

  for (const subschema of subschemas) {
    const nodeType = subschema.schema.getType('Node');
    if (nodeType) {
      if (!isInterfaceType(nodeType)) {
        throw new Error(`Node type should be an interface!`);
      }
      const implementations = subschema.schema.getImplementations(nodeType);
      for (const implementedType of implementations.objects) {
        typeNames.push(implementedType.name);

        subschema.merge = subschema.merge || {};
        subschema.merge[implementedType.name] = defaultRelayMergeConfig;
      }
    }
  }

  const relaySubschemaConfig: SubschemaConfig = {
    schema: makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          node(id: ID!): Node
        }
        interface Node {
          id: ID!
        }
        ${typeNames
          .map(
            typeName => `
          type ${typeName} implements Node {
            id: ID!
          }
        `
          )
          .join('\n')}
      `,
      resolvers: {
        Query: {
          node: (_, { id }) => ({ id }),
        },
        Node: {
          __resolveType: ({ id }: { id: string }) => getTypeNameFromId(id),
        },
      },
    }),
  };

  subschemas.push(relaySubschemaConfig);
  return subschemas;
}
