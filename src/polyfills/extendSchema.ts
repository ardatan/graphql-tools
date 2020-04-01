import {
  DocumentNode,
  GraphQLSchema,
  extendSchema as graphqlExtendSchema,
} from 'graphql';

import { getResolversFromSchema } from '../utils/getResolversFromSchema';
import { IResolverOptions } from '../Interfaces';

// polyfill for graphql < v14.2 which does not support subscriptions
export function extendSchema(
  schema: GraphQLSchema,
  extension: DocumentNode,
  options: any,
): GraphQLSchema {
  const subscriptionType = schema.getSubscriptionType();
  if (subscriptionType == null) {
    return graphqlExtendSchema(schema, extension, options);
  }

  const resolvers = getResolversFromSchema(schema);

  const subscriptionTypeName = subscriptionType.name;
  const subscriptionResolvers = resolvers[
    subscriptionTypeName
  ] as IResolverOptions;

  const extendedSchema = graphqlExtendSchema(schema, extension, options);

  const fields = extendedSchema.getSubscriptionType().getFields();
  Object.keys(subscriptionResolvers).forEach((fieldName) => {
    fields[fieldName].subscribe = subscriptionResolvers[fieldName].subscribe;
  });

  return extendedSchema;
}
