import { GraphQLSchema } from 'graphql';
import { StitchingDirectivesOptions } from './types';
export declare function stitchingDirectivesValidator(
  options?: StitchingDirectivesOptions
): (schema: GraphQLSchema) => GraphQLSchema;
