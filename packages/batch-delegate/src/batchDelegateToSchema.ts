import { BatchDelegateOptions } from './types';

import { getNullableType, GraphQLError, GraphQLList } from 'graphql';

import { externalValueFromResult } from '@graphql-tools/delegate';
import { relocatedError } from '@graphql-tools/utils';

import { getLoader } from './getLoader';

export async function batchDelegateToSchema<TContext = any>(options: BatchDelegateOptions<TContext>): Promise<any> {
  const key = options.key;
  if (key == null) {
    return null;
  } else if (Array.isArray(key) && !key.length) {
    return [];
  }

  const {
    schema,
    info,
    fieldName = info.fieldName,
    returnType = info.returnType,
    context,
    onLocatedError = (originalError: GraphQLError) =>
      relocatedError(originalError, originalError.path ? originalError.path.slice(1) : []),
  } = options;

  const loader = getLoader(options);

  if (Array.isArray(key)) {
    const results = await loader.loadMany(key);

    return results.map(result =>
      result instanceof Error
        ? result
        : externalValueFromResult({
            result,
            schema,
            info,
            context,
            fieldName,
            returnType: (getNullableType(returnType) as GraphQLList<any>).ofType,
            onLocatedError,
          })
    );
  }

  const result = await loader.load(key);
  return result instanceof Error
    ? result
    : externalValueFromResult({
        result,
        schema,
        info,
        context,
        fieldName,
        returnType,
        onLocatedError,
      });
}
