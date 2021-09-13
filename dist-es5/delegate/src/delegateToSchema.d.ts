import { GraphQLSchema } from 'graphql';
import { Executor } from '@graphql-tools/utils';
import { IDelegateToSchemaOptions, IDelegateRequestOptions } from './types';
export declare function delegateToSchema<TContext = Record<string, any>, TArgs = any>(
  options: IDelegateToSchemaOptions<TContext, TArgs>
): any;
export declare function delegateRequest<TContext = Record<string, any>, TArgs = any>(
  options: IDelegateRequestOptions<TContext, TArgs>
): any;
export declare const createDefaultExecutor: (schema: GraphQLSchema) => Executor;
