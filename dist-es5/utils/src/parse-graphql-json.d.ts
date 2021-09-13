import { ParseOptions } from 'graphql';
import { Source } from './loaders';
import { SchemaPrintOptions } from './types';
export declare function parseGraphQLJSON(
  location: string,
  jsonContent: string,
  options: SchemaPrintOptions & ParseOptions
): Source;
