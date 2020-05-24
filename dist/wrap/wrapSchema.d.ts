import { GraphQLSchema } from 'graphql';
import { Transform, SubschemaConfig } from '../Interfaces';
export declare function wrapSchema(subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig, transforms?: Array<Transform>): GraphQLSchema;
