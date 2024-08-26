import {
  getNullableType,
  GraphQLCompositeType,
  GraphQLError,
  GraphQLList,
  GraphQLOutputType,
  GraphQLResolveInfo,
  GraphQLSchema,
  isAbstractType,
  isCompositeType,
  isLeafType,
  isListType,
  locatedError,
} from 'graphql';
import { isPromise, Maybe } from '@graphql-tools/utils';
import { annotateExternalObject, isExternalObject, mergeFields } from './mergeFields.js';
import { Subschema } from './Subschema.js';
import { MergedTypeInfo, StitchingInfo, SubschemaConfig } from './types.js';

export function resolveExternalValue<TContext extends Record<string, any>>(
  result: any,
  unpathedErrors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig<any, any, any, TContext>,
  context?: Record<string, any>,
  info?: GraphQLResolveInfo,
  returnType = getReturnType(info),
  skipTypeMerging?: boolean,
): any {
  const type = getNullableType(returnType);

  if (result instanceof Error) {
    return result;
  }

  if (result == null) {
    return reportUnpathedErrorsViaNull(unpathedErrors);
  }

  if (isLeafType(type)) {
    // Gateway doesn't need to know about errors in leaf values
    // If an enum value is invalid, it is an subschema error not a gateway error
    try {
      return type.parseValue(result);
    } catch {
      return null;
    }
  } else if (isCompositeType(type)) {
    const result$ = resolveExternalObject(
      type,
      result,
      unpathedErrors,
      subschema,
      context,
      info,
      skipTypeMerging,
    );
    if (info && isAbstractType(type)) {
      function checkAbstractResolvedCorrectly(result: any) {
        if (result.__typename != null) {
          const resolvedType = info!.schema.getType(result.__typename);
          if (!resolvedType) {
            return null;
          }
        }
        return result;
      }
      if (isPromise(result$)) {
        return result$.then(checkAbstractResolvedCorrectly);
      }
      return checkAbstractResolvedCorrectly(result$);
    }
    return result$;
  } else if (isListType(type)) {
    if (Array.isArray(result)) {
      return resolveExternalList(
        type,
        result,
        unpathedErrors,
        subschema,
        context,
        info,
        skipTypeMerging,
      );
    }
    return resolveExternalValue(
      result,
      unpathedErrors,
      subschema,
      context,
      info,
      type.ofType,
      skipTypeMerging,
    );
  }
}

function resolveExternalObject<TContext extends Record<string, any>>(
  type: GraphQLCompositeType,
  object: any,
  unpathedErrors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig<any, any, any, TContext>,
  context?: Record<string, any>,
  info?: GraphQLResolveInfo,
  skipTypeMerging?: boolean,
) {
  // if we have already resolved this object, for example, when the identical object appears twice
  // in a list, see https://github.com/ardatan/graphql-tools/issues/2304
  if (!isExternalObject(object)) {
    annotateExternalObject(object, unpathedErrors, subschema, Object.create(null));
  }
  if (skipTypeMerging || info == null) {
    return object;
  }

  const stitchingInfo = info.schema.extensions?.['stitchingInfo'] as Maybe<StitchingInfo>;

  if (stitchingInfo == null) {
    return object;
  }

  // Within the stitching context, delegation to a stitched GraphQLSchema or SubschemaConfig
  // will be redirected to the appropriate Subschema object, from which merge targets can be queried.

  let mergedTypeInfo: MergedTypeInfo | undefined;
  const possibleTypeNames = [object.__typename, type.name];
  for (const possibleTypeName of possibleTypeNames) {
    if (
      possibleTypeName != null &&
      stitchingInfo.mergedTypes[possibleTypeName]?.targetSubschemas?.get(subschema as Subschema)
        ?.length
    ) {
      mergedTypeInfo = stitchingInfo.mergedTypes[possibleTypeName];
      break;
    }
  }

  // If there are no merge targets from the subschema, return.
  if (!mergedTypeInfo) {
    return object;
  }

  return mergeFields(mergedTypeInfo, object, subschema as Subschema, context, info);
}

function resolveExternalList<TContext extends Record<string, any>>(
  type: GraphQLList<any>,
  list: Array<any>,
  unpathedErrors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig<any, any, any, TContext>,
  context?: Record<string, any>,
  info?: GraphQLResolveInfo,
  skipTypeMerging?: boolean,
) {
  return list.map(listMember =>
    resolveExternalValue(
      listMember,
      unpathedErrors,
      subschema,
      context,
      info,
      type.ofType,
      skipTypeMerging,
    ),
  );
}

const reportedErrors = new WeakMap<GraphQLError, boolean>();

function reportUnpathedErrorsViaNull(unpathedErrors: Array<GraphQLError>) {
  if (unpathedErrors.length) {
    const unreportedErrors: Array<GraphQLError> = [];
    for (const error of unpathedErrors) {
      if (!reportedErrors.has(error)) {
        unreportedErrors.push(error);
        reportedErrors.set(error, true);
      }
    }

    if (unreportedErrors.length) {
      if (unreportedErrors.length === 1) {
        return locatedError(unreportedErrors[0], undefined as any, unreportedErrors[0].path as any);
      }

      return new AggregateError(
        unreportedErrors.map(e =>
          // We cast path as any for GraphQL.js 14 compat
          // locatedError path argument must be defined, but it is just forwarded to a constructor that allows a undefined value
          // https://github.com/graphql/graphql-js/blob/b4bff0ba9c15c9d7245dd68556e754c41f263289/src/error/locatedError.js#L25
          // https://github.com/graphql/graphql-js/blob/b4bff0ba9c15c9d7245dd68556e754c41f263289/src/error/GraphQLError.js#L19
          locatedError(e, undefined as any, unreportedErrors[0].path as any),
        ),
        unreportedErrors.map(error => error.message).join(', \n'),
      );
    }
  }

  return null;
}

function getReturnType(info: GraphQLResolveInfo | undefined): GraphQLOutputType {
  if (info == null) {
    throw new Error(`Return type cannot be inferred without a source schema.`);
  }
  return info.returnType;
}
