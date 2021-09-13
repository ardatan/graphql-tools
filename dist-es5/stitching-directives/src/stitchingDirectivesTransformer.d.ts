import { SubschemaConfig } from '@graphql-tools/delegate';
import { StitchingDirectivesOptions } from './types';
export declare function stitchingDirectivesTransformer(
  options?: StitchingDirectivesOptions
): (subschemaConfig: SubschemaConfig) => SubschemaConfig;
