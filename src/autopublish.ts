import { GraphQLSchema, GraphQLResolveInfo } from 'graphql';
import { chainResolvers } from './schemaGenerator';
import { IPubSub } from './Interfaces';

export function autopublishMutationResults(
  schema: GraphQLSchema,
  pubsub: IPubSub,
) {
  // decorate the mutations with your thingy
  const mutationFields = schema.getMutationType().getFields();
  Object.keys(mutationFields).forEach(fieldName => {
    const field = mutationFields[fieldName];

    // define the function
    const publishMutatedValue = (
      source: any,
      args: { [name: string]: any },
      ctx: any,
      info: GraphQLResolveInfo,
    ) => {
      pubsub.publish(fieldName, source);
      return source;
    };

    field.resolve = chainResolvers([field.resolve, publishMutatedValue]);
  });
}
