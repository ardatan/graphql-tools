import { GraphQLSchema } from 'graphql';
import { Transform, SubschemaConfig, GraphQLSchemaWithTransforms } from '../Interfaces';
export declare function transformSchema(subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig, transforms: Array<Transform>): GraphQLSchemaWithTransforms;
