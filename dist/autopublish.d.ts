import { GraphQLSchema } from 'graphql';
import { IPubSub } from './Interfaces';
export declare function autopublishMutationResults(schema: GraphQLSchema, pubsub: IPubSub): void;
