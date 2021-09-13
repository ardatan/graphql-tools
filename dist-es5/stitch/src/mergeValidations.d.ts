import { GraphQLFieldConfig, GraphQLInputFieldConfig, GraphQLArgumentConfig, GraphQLEnumType } from 'graphql';
import {
  MergeTypeCandidate,
  MergeFieldConfigCandidate,
  MergeInputFieldConfigCandidate,
  TypeMergingOptions,
} from './types';
export declare function validateFieldConsistency<TContext = Record<string, any>>(
  finalFieldConfig: GraphQLFieldConfig<any, any>,
  candidates: Array<MergeFieldConfigCandidate<TContext>>,
  typeMergingOptions?: TypeMergingOptions<TContext>
): void;
export declare function validateInputObjectConsistency<TContext = Record<string, any>>(
  fieldInclusionMap: Record<string, number>,
  candidates: Array<MergeTypeCandidate<TContext>>,
  typeMergingOptions?: TypeMergingOptions<TContext>
): void;
export declare function validateInputFieldConsistency<TContext = Record<string, any>>(
  finalInputFieldConfig: GraphQLInputFieldConfig,
  candidates: Array<MergeInputFieldConfigCandidate<TContext>>,
  typeMergingOptions?: TypeMergingOptions<TContext>
): void;
export declare function validateTypeConsistency<TContext = Record<string, any>>(
  finalElementConfig: GraphQLFieldConfig<any, any> | GraphQLArgumentConfig | GraphQLInputFieldConfig,
  candidates: Array<GraphQLFieldConfig<any, any> | GraphQLArgumentConfig | GraphQLInputFieldConfig>,
  definitionType: string,
  settingNamespace: string,
  typeMergingOptions?: TypeMergingOptions<TContext>
): void;
export declare function validateInputEnumConsistency<TContext = Record<string, any>>(
  inputEnumType: GraphQLEnumType,
  candidates: Array<GraphQLArgumentConfig | GraphQLInputFieldConfig>,
  typeMergingOptions?: TypeMergingOptions<TContext>
): void;
