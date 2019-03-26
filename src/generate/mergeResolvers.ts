// from https://gist.github.com/hellendag/2aa9ad1f9b771f38802760c269bb1b76

import { ResolverMap } from '../Interfaces';

/**
 * Given a map of mock GraphQL resolver functions, merge in a map of
 * desired mocks. Generally, `target` will be the default mocked values,
 * and `input` will be the values desired for a portal example or Jest tests.
 */
const mergeResolver = (target: ResolverMap, input: ResolverMap) => {
  const inputTypenames = Object.keys(input);
  const merged = inputTypenames.reduce(
    (accum, key) => {
      const inputResolver = input[key];
      if (target.hasOwnProperty(key)) {
        const targetResolver = target[key];
        const resolvedInput = inputResolver();
        const resolvedTarget = targetResolver();
        if (
          !!resolvedTarget &&
          !!resolvedInput &&
          typeof resolvedTarget === 'object' &&
          typeof resolvedInput === 'object' &&
          !Array.isArray(resolvedTarget) &&
          !Array.isArray(resolvedInput)
        ) {
          const newValue = { ...resolvedTarget, ...resolvedInput };
          return {
            ...accum,
            [key]: () => newValue,
          };
        }
      }
      return { ...accum, [key]: inputResolver };
    },
    { ...target },
  ) as ResolverMap;
  return merged;
};

const mergeResolvers = (target: ResolverMap, ...inputs: ResolverMap[]) => {
  let resolver = target;
  inputs.forEach(input => {
    resolver = mergeResolver(resolver, input);
  });
  return resolver;
};

export default mergeResolvers;
