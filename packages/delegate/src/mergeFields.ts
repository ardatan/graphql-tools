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
import { ValueOrPromise } from 'value-or-promise';
import { collectFields, memoize1, relocatedError } from '@graphql-tools/utils';
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

function asyncForEach<T>(array: T[], fn: (item: T) => ValueOrPromise<void>) {
  return array.reduce((prev, curr) => prev.then(() => fn(curr)), new ValueOrPromise(() => {}));
}

export const getActualFieldNodes = memoize1(function (fieldNode: FieldNode) {
  return [fieldNode];
});

export function mergeFields<TContext>(
  mergedTypeInfo: MergedTypeInfo,
  object: any,
  sourceSubschema: Subschema<any, any, any, TContext>,
  context: any,
  info: GraphQLResolveInfo,
): ValueOrPromise<any> {
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

  return asyncForEach(delegationMaps, delegationMap =>
    executeDelegationStage(mergedTypeInfo, delegationMap, object, context, info),
  ).then(() => object);
}

function executeDelegationStage(
  mergedTypeInfo: MergedTypeInfo,
  delegationMap: Map<Subschema, SelectionSetNode>,
  object: ExternalObject,
  context: any,
  info: GraphQLResolveInfo,
): ValueOrPromise<void> {
  const combinedErrors = object[UNPATHED_ERRORS_SYMBOL];

  const path = responsePathAsArray(info.path);

  const combinedFieldSubschemaMap = object[FIELD_SUBSCHEMA_MAP_SYMBOL];

  function finallyFn(source: any, subschema: Subschema, selectionSet: SelectionSetNode) {
    if (source instanceof Error || source == null) {
      const schema = subschema.transformedSchema || info.schema;
      const type = schema.getType(object.__typename) as GraphQLObjectType;
      const { fields } = collectFields(schema, EMPTY_OBJECT, EMPTY_OBJECT, type, selectionSet);
      const nullResult: Record<string, any> = {};
      for (const [responseKey, fieldNodes] of fields) {
        const combinedPath = [...path, responseKey];
        if (source instanceof GraphQLError) {
          nullResult[responseKey] = relocatedError(source, combinedPath);
        } else if (source instanceof Error) {
          nullResult[responseKey] = locatedError(source, fieldNodes, combinedPath);
        } else {
          nullResult[responseKey] = null;
        }
      }
      source = nullResult;
    } else {
      if (source[UNPATHED_ERRORS_SYMBOL]) {
        combinedErrors.push(...source[UNPATHED_ERRORS_SYMBOL]);
      }
    }

    const objectSubschema = source[OBJECT_SUBSCHEMA_SYMBOL];
    const fieldSubschemaMap = source[FIELD_SUBSCHEMA_MAP_SYMBOL];
    for (const responseKey in source) {
      const existingPropValue = object[responseKey];
      const sourcePropValue = source[responseKey];
      if (sourcePropValue != null || existingPropValue == null) {
        object[responseKey] = sourcePropValue;
      }
      combinedFieldSubschemaMap[responseKey] = fieldSubschemaMap?.[responseKey] ?? objectSubschema;
    }
  }

  return ValueOrPromise.all(
    [...delegationMap.entries()].map(([subschema, selectionSet]) =>
      new ValueOrPromise(() => {
        const schema = subschema.transformedSchema || info.schema;
        const type = schema.getType(object.__typename) as GraphQLObjectType;
        const resolver = mergedTypeInfo.resolvers.get(subschema);
        if (resolver) {
          return resolver(object, context, info, subschema, selectionSet, undefined, type);
        }
      })
        .then(source => finallyFn(source, subschema, selectionSet))
        .catch(error => finallyFn(error, subschema, selectionSet)),
    ),
  ).then(() => {});
}
