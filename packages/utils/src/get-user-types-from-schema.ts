import { GraphQLSchema, GraphQLObjectType, isObjectType } from 'graphql';

/**
 * Get all GraphQL types from schema without:
 *
 * - Query, Mutation, Subscription objects
 * - Internal scalars added by parser
 *
 * @param schema
 */
export function getUserTypesFromSchema(schema: GraphQLSchema): GraphQLObjectType[] {
  const allTypesMap = schema.getTypeMap();

  // tslint:disable-next-line: no-unnecessary-local-variable
  const modelTypes = Object.values(allTypesMap).filter((graphqlType: GraphQLObjectType) => {
    if (isObjectType(graphqlType)) {
      // Filter out private types
      if (graphqlType.name.startsWith('__')) {
        return false;
      }
      if (schema.getMutationType() && graphqlType.name === schema.getMutationType().name) {
        return false;
      }
      if (schema.getQueryType() && graphqlType.name === schema.getQueryType().name) {
        return false;
      }
      if (schema.getSubscriptionType() && graphqlType.name === schema.getSubscriptionType().name) {
        return false;
      }

      return true;
    }

    return false;
  });

  return modelTypes as GraphQLObjectType[];
}
