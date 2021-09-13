import { GraphQLNamedType } from 'graphql';
import { MergeTypeCandidate, TypeMergingOptions } from './types';
export declare function mergeCandidates<TContext = Record<string, any>>(
  typeName: string,
  candidates: Array<MergeTypeCandidate<TContext>>,
  typeMergingOptions?: TypeMergingOptions<TContext>
): GraphQLNamedType;
