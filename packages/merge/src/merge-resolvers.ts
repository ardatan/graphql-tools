import { IResolvers, mergeDeep } from '@graphql-tools/utils';

export type ResolversFactory<TContext> = (...args: any[]) => IResolvers<any, TContext>;
export type ResolversDefinition<TContext> = IResolvers<any, TContext> | ResolversFactory<TContext>;

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
      return resolvers.concat(resultsOfFactories).reduce(mergeDeep, {});
    }) as any;
  } else {
    result = resolvers.reduce(mergeDeep, {});
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
