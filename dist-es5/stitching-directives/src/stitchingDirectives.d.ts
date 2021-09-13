import { GraphQLDirective, GraphQLSchema } from 'graphql';
import { SubschemaConfig } from '@graphql-tools/delegate';
import { StitchingDirectivesOptions } from './types';
export interface StitchingDirectivesResult {
  keyDirectiveTypeDefs: string;
  computedDirectiveTypeDefs: string;
  mergeDirectiveTypeDefs: string;
  canonicalDirectiveTypeDefs: string;
  stitchingDirectivesTypeDefs: string;
  allStitchingDirectivesTypeDefs: string;
  stitchingDirectivesValidator: (schema: GraphQLSchema) => GraphQLSchema;
  stitchingDirectivesTransformer: (subschemaConfig: SubschemaConfig) => SubschemaConfig;
  keyDirective: GraphQLDirective;
  computedDirective: GraphQLDirective;
  mergeDirective: GraphQLDirective;
  canonicalDirective: GraphQLDirective;
  allStitchingDirectives: Array<GraphQLDirective>;
}
export declare function stitchingDirectives(options?: StitchingDirectivesOptions): StitchingDirectivesResult;
