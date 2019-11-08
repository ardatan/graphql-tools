import { defaultFieldResolver, getNamedType, ExecutionResult } from 'graphql';
import { getErrorsFromParent, getSubschemasFromParent, MERGED_NULL_SYMBOL } from './errors';
import { handleResult, handleErrors } from './checkResultAndHandleErrors';
import { getResponseKeyFromInfo } from './getResponseKeyFromInfo';
import { IGraphQLToolsResolveInfo } from '../Interfaces';

// Resolver that knows how to:
// a) handle aliases for proxied schemas
// b) handle errors from proxied schemas
// c) handle external to internal enum coversion
export default async function defaultMergedResolver(
  parent: Record<string, any>,
  args: Record<string, any>,
  context: Record<string, any>,
  info: IGraphQLToolsResolveInfo,
) {
  if (!parent) {
    return null;
  }

  const responseKey = getResponseKeyFromInfo(info);
  const errors = getErrorsFromParent(parent, responseKey);

  // check to see if parent is not a proxied result, i.e. if parent resolver was manually overwritten
  // See https://github.com/apollographql/graphql-tools/issues/967
  if (!errors) {
    return defaultFieldResolver(parent, args, context, info);
  }

  const result = parent[responseKey];

  if (result == null || result[MERGED_NULL_SYMBOL]) {
    return (errors.length) ? handleErrors(info, errors) : null;
  }

  const parentSubschemas = getSubschemasFromParent(parent);
  const mergedResult = handleResult(info, result, errors, parentSubschemas);
  if (info.mergeInfo) {
    const typeName = getNamedType(info.returnType).name;
    const initialSubschemas = info.mergeInfo.mergedTypes[typeName];
    if (initialSubschemas) {
      const remainingSubschemas = info.mergeInfo.mergedTypes[typeName].filter(
        subschema => !parentSubschemas.includes(subschema)
      );
      if (remainingSubschemas.length) {
        const additionalResults = await Promise.all(remainingSubschemas.map(subschema => {
          const mergedTypeResolver = subschema.mergedTypeConfigs[typeName].mergedTypeResolver;
          return mergedTypeResolver(subschema, parent, args, context, info);
        }));
        additionalResults.forEach((additionalResult: ExecutionResult) => {
          Object.assign(result, additionalResult);
        });
      }
    }
  }

  return mergedResult;
}
