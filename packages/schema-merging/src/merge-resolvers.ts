import { IResolvers } from '@graphql-tools/schema-stitching';
import * as deepMerge from 'deepmerge';
import { isScalarType } from 'graphql';

export type ResolversFactory<TContext> = (...args: any[]) => IResolvers<any, TContext>;
export type ResolversDefinition<TContext> = IResolvers<any, TContext> | ResolversFactory<TContext>;

const isMergeableObject = (target: any): target is object => {
  if (!target) {
    return false;
  }

  if (typeof target !== 'object') {
    return false;
  }

  const stringValue = Object.prototype.toString.call(target);

  if (stringValue === '[object RegExp]') {
    return false;
  }

  if (stringValue === '[object Date]') {
    return false;
  }

  if (isScalarType(target)) {
    return false;
  }

  return true;
};

export interface MergeResolversOptions {
  exclusions?: string[];
}

export function mergeResolvers<TContext, T extends ResolversDefinition<TContext>>(
  resolversDefinitions: T[],
  options?: MergeResolversOptions
): T {
  if (!resolversDefinitions || resolversDefinitions.length === 0) {
    return {} as T;
  }

  if (resolversDefinitions.length === 1) {
    return resolversDefinitions[0];
  }

  const resolversFactories = new Array<ResolversFactory<TContext>>();
  const resolvers = new Array<IResolvers<any, TContext>>();

  for (const resolversDefinition of resolversDefinitions) {
    if (typeof resolversDefinition === 'function') {
      resolversFactories.push(resolversDefinition as ResolversFactory<TContext>);
    } else if (typeof resolversDefinition === 'object') {
      resolvers.push(resolversDefinition as IResolvers<any, TContext>);
    }
  }
  let result: T = {} as T;
  if (resolversFactories.length) {
    result = ((...args: any[]) => {
      const resultsOfFactories = resolversFactories.map(factory => factory(...args));
      return deepMerge.all([...resolvers, ...resultsOfFactories], { isMergeableObject }) as any;
    }) as any;
  } else {
    result = (deepMerge.all(resolvers, { isMergeableObject }) as IResolvers<any, TContext>) as T;
  }
  if (options && options.exclusions) {
    for (const exclusion of options.exclusions) {
      const [typeName, fieldName] = exclusion.split('.');
      if (!fieldName || fieldName === '*') {
        delete result[typeName];
      } else if (result[typeName]) {
        delete result[typeName][fieldName];
      }
    }
  }
  return result;
}
