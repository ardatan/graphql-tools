import { GraphQLResolveInfo, defaultFieldResolver, GraphQLList, GraphQLOutputType } from 'graphql';

import { getResponseKeyFromInfo, mapAsyncIterator } from '@graphql-tools/utils';

import { ExternalObject, MergedExecutionResult } from './types';

import { createExternalValue } from './externalValues';
import {
  getInitialPath,
  getInitialPossibleFields,
  getReceiver,
  getSubschema,
  getUnpathedErrors,
  isExternalObject,
} from './externalObjects';

import { getMergedParent } from './getMergedParent';
import { fieldShouldStream } from './fieldShouldStream';

/**
 * Resolver that knows how to:
 * a) handle aliases for proxied schemas
 * b) handle errors from proxied schemas
 * c) handle external to internal enum/scalar conversion
 * d) handle type merging
 * e) handle deferred values
 */
export function defaultMergedResolver(
  parent: ExternalObject,
  args: Record<string, any>,
  context: Record<string, any>,
  info: GraphQLResolveInfo
): any {
  if (!isExternalObject(parent)) {
    return defaultFieldResolver(parent, args, context, info);
  }

  const responseKey = getResponseKeyFromInfo(info);

  const initialPossibleFields = getInitialPossibleFields(parent);

  if (initialPossibleFields === undefined) {
    // TODO: can this be removed in the next major release?
    // legacy use of  delegation without setting transformedSchema
    const data = parent[responseKey];
    if (data !== undefined) {
      const unpathedErrors = getUnpathedErrors(parent);
      const initialPath = getInitialPath(parent);
      const subschema = getSubschema(parent, responseKey);
      return createExternalValue(data, unpathedErrors, initialPath, subschema, context, info);
    }
  } else if (info.fieldNodes[0].name.value in initialPossibleFields) {
    return resolveField(parent, responseKey, context, info);
  }

  return getMergedParent(parent, context, info).then(mergedParent =>
    resolveField(mergedParent, responseKey, context, info)
  );
}

function resolveField(
  parent: ExternalObject,
  responseKey: string,
  context: Record<string, any>,
  info: GraphQLResolveInfo
): any {
  const initialPath = getInitialPath(parent);
  const subschema = getSubschema(parent, responseKey);
  const receiver = getReceiver(parent, subschema);

  const data = parent[responseKey];
  if (receiver !== undefined) {
    if (fieldShouldStream(info)) {
      return receiver.request(info).then(asyncIterator => {
        const listMemberInfo: GraphQLResolveInfo = {
          ...info,
          returnType: (info.returnType as GraphQLList<GraphQLOutputType>).ofType,
        };
        return mapAsyncIterator(asyncIterator as AsyncIterableIterator<MergedExecutionResult>, ({ data, unpathedErrors }) =>
          createExternalValue(data, unpathedErrors, initialPath, subschema, context, listMemberInfo, receiver));
      });
    }

    if (data === undefined) {
      return receiver.request(info).then(result => {
        const { data, unpathedErrors } = result as MergedExecutionResult;
        return createExternalValue(data, unpathedErrors, initialPath, subschema, context, info, receiver);
      });
    }

    const unpathedErrors = getUnpathedErrors(parent);
    receiver.update(info, { data, unpathedErrors });
    return createExternalValue(data, unpathedErrors, initialPath, subschema, context, info, receiver);
  }

  if (data !== undefined) {
    const unpathedErrors = getUnpathedErrors(parent);
    return createExternalValue(data, unpathedErrors, initialPath, subschema, context, info, receiver);
  }

  // throw error?
}
