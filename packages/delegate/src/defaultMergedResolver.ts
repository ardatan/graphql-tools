import { GraphQLResolveInfo, defaultFieldResolver } from 'graphql';

import { getResponseKeyFromInfo } from '@graphql-tools/utils';

import { ExternalObject } from './types';

import { resolveExternalValue } from './resolveExternalValue';
import {
  getInitialPossibleFields,
  getReceiver,
  getSubschema,
  getUnpathedErrors,
  isExternalObject,
} from './externalObjects';

import { getMergedParent } from './getMergedParent';

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
      const fieldSubschema = getSubschema(parent, responseKey);
      return resolveExternalValue(data, unpathedErrors, fieldSubschema, context, info);
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
  const fieldSubschema = getSubschema(parent, responseKey);
  const receiver = getReceiver(parent, fieldSubschema);

  if (receiver !== undefined) {
    return receiver.request(info);
  }

  const data = parent[responseKey];
  if (data !== undefined) {
    const unpathedErrors = getUnpathedErrors(parent);
    return resolveExternalValue(data, unpathedErrors, fieldSubschema, context, info, receiver);
  }

  // throw error?
}
