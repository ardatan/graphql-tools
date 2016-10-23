import {
    GraphQLSchema,
    GraphQLFieldDefinition,
    GraphQLResolveInfo,
} from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import { chainResolvers } from './schemaGenerator';



export function autopublishMutationResults(schema: GraphQLSchema, pubsub: PubSub) {
    // decorate the mutations with your thingy
    const mutationFields = schema.getMutationType().getFields();
    Object.keys(mutationFields).forEach( fieldName => {
        const field = mutationFields[fieldName] as GraphQLFieldDefinition;

        // define the function
        const publishMutatedValue = (
            source: any,
            args: {[name: string]: any},
            ctx: any,
            info: GraphQLResolveInfo
        ) => {
            pubsub.publish(fieldName, source);
            return source;
        };

        field.resolve = chainResolvers([field.resolve, publishMutatedValue]);
    });
}
