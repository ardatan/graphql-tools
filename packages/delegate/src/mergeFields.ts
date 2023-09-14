import {
  FieldNode,
  GraphQLError,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLSchema,
  locatedError,
  responsePathAsArray,
  SelectionSetNode,
} from 'graphql';
import {
  collectFields,
  isPromise,
  MaybePromise,
  memoize1,
  relocatedError,
} from '@graphql-tools/utils';
import { Subschema } from './Subschema.js';
import {
  FIELD_SUBSCHEMA_MAP_SYMBOL,
  OBJECT_SUBSCHEMA_SYMBOL,
  UNPATHED_ERRORS_SYMBOL,
} from './symbols.js';
import { ExternalObject, MergedTypeInfo, SubschemaConfig } from './types.js';

export function isExternalObject(data: any): data is ExternalObject {
  return data[UNPATHED_ERRORS_SYMBOL] !== undefined;
}

export function annotateExternalObject<TContext>(
  object: any,
  errors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig<any, any, any, TContext> | undefined,
  subschemaMap: Record<string, GraphQLSchema | SubschemaConfig<any, any, any, Record<string, any>>>,
): ExternalObject {
  Object.defineProperties(object, {
    [OBJECT_SUBSCHEMA_SYMBOL]: { value: subschema },
    [FIELD_SUBSCHEMA_MAP_SYMBOL]: { value: subschemaMap },
    [UNPATHED_ERRORS_SYMBOL]: { value: errors },
  });
  return object;
}

export function getSubschema(
  object: ExternalObject,
  responseKey: string,
): GraphQLSchema | SubschemaConfig {
  return object[FIELD_SUBSCHEMA_MAP_SYMBOL][responseKey] ?? object[OBJECT_SUBSCHEMA_SYMBOL];
}

export function getUnpathedErrors(object: ExternalObject): Array<GraphQLError> {
  return object[UNPATHED_ERRORS_SYMBOL];
}

const EMPTY_ARRAY: any[] = [];
const EMPTY_OBJECT = Object.create(null);

export const getActualFieldNodes = memoize1(function (fieldNode: FieldNode) {
  return [fieldNode];
});

export function mergeFields<TContext>(
  mergedTypeInfo: MergedTypeInfo,
  object: any,
  sourceSubschema: Subschema<any, any, any, TContext>,
  context: any,
  info: GraphQLResolveInfo,
): MaybePromise<any> {
  const delegationMaps = mergedTypeInfo.delegationPlanBuilder(
    info.schema,
    sourceSubschema,
    info.variableValues != null && Object.keys(info.variableValues).length > 0
      ? info.variableValues
      : EMPTY_OBJECT,
    info.fragments != null && Object.keys(info.fragments).length > 0
      ? info.fragments
      : EMPTY_OBJECT,
    info.fieldNodes?.length
      ? info.fieldNodes.length === 1
        ? getActualFieldNodes(info.fieldNodes[0])
        : (info.fieldNodes as FieldNode[])
      : EMPTY_ARRAY,
  );

  const res$ = delegationMaps.reduce<MaybePromise<void>>((prev, delegationMap) => {
    function executeFn() {
      return executeDelegationStage(mergedTypeInfo, delegationMap, object, context, info);
    }
    if (isPromise(prev)) {
      return prev.then(executeFn);
    }
    return executeFn();
  }, undefined);

  if (isPromise(res$)) {
    return res$.then(() => object);
  }

  return object;
}

function handleResolverResult(
  resolverResult: any,
  subschema: Subschema,
  selectionSet: SelectionSetNode,
  object: ExternalObject,
  combinedFieldSubschemaMap: Record<
    string,
    GraphQLSchema | SubschemaConfig<any, any, any, Record<string, any>>
  >,
  info: GraphQLResolveInfo,
  path: Array<string | number>,
  combinedErrors: Array<GraphQLError>,
) {
  if (resolverResult instanceof Error || resolverResult == null) {
    const schema = subschema.transformedSchema || info.schema;
    const type = schema.getType(object.__typename) as GraphQLObjectType;
    const { fields } = collectFields(schema, EMPTY_OBJECT, EMPTY_OBJECT, type, selectionSet);
    const nullResult: Record<string, any> = {};
    for (const [responseKey, fieldNodes] of fields) {
      const combinedPath = [...path, responseKey];
      if (resolverResult instanceof GraphQLError) {
        nullResult[responseKey] = relocatedError(resolverResult, combinedPath);
      } else if (resolverResult instanceof Error) {
        nullResult[responseKey] = locatedError(resolverResult, fieldNodes, combinedPath);
      } else {
        nullResult[responseKey] = null;
      }
    }
    resolverResult = nullResult;
  } else {
    if (resolverResult[UNPATHED_ERRORS_SYMBOL]) {
      combinedErrors.push(...resolverResult[UNPATHED_ERRORS_SYMBOL]);
    }
  }

  const objectSubschema = resolverResult[OBJECT_SUBSCHEMA_SYMBOL];
  const fieldSubschemaMap = resolverResult[FIELD_SUBSCHEMA_MAP_SYMBOL];

  Object.entries(resolverResult).forEach(([responseKey, sourcePropValue]) => {
    if (sourcePropValue != null) {
      object[responseKey] = sourcePropValue;
    }
    combinedFieldSubschemaMap[responseKey] = fieldSubschemaMap?.[responseKey] ?? objectSubschema;
  });
}

function executeDelegationStage(
  mergedTypeInfo: MergedTypeInfo,
  delegationMap: Map<Subschema, SelectionSetNode>,
  object: ExternalObject,
  context: any,
  info: GraphQLResolveInfo,
): MaybePromise<void> {
  const combinedErrors = object[UNPATHED_ERRORS_SYMBOL];

  const path = responsePathAsArray(info.path);

  const combinedFieldSubschemaMap = object[FIELD_SUBSCHEMA_MAP_SYMBOL];

  const jobs: PromiseLike<any>[] = [];
  for (const [subschema, selectionSet] of delegationMap) {
    const schema = subschema.transformedSchema || info.schema;
    const type = schema.getType(object.__typename) as GraphQLObjectType;
    const resolver = mergedTypeInfo.resolvers.get(subschema);
    if (resolver) {
      try {
        const resolverResult$ = resolver(
          object,
          context,
          info,
          subschema,
          selectionSet,
          undefined,
          type,
        );
        if (isPromise(resolverResult$)) {
          jobs.push(
            (
              resolverResult$.then(resolverResult =>
                handleResolverResult(
                  resolverResult,
                  subschema,
                  selectionSet,
                  object,
                  combinedFieldSubschemaMap,
                  info,
                  path,
                  combinedErrors,
                ),
              ) as Promise<any>
            ).catch(error =>
              handleResolverResult(
                error,
                subschema,
                selectionSet,
                object,
                combinedFieldSubschemaMap,
                info,
                path,
                combinedErrors,
              ),
            ) as any,
          );
        } else {
          handleResolverResult(
            resolverResult$,
            subschema,
            selectionSet,
            object,
            combinedFieldSubschemaMap,
            info,
            path,
            combinedErrors,
          );
        }
      } catch (error) {
        handleResolverResult(
          error,
          subschema,
          selectionSet,
          object,
          combinedFieldSubschemaMap,
          info,
          path,
          combinedErrors,
        );
      }
    }
  }

  if (jobs.length) {
    if (jobs.length === 1) {
      return jobs[0];
    }
    return Promise.all(jobs) as any;
  }
}
