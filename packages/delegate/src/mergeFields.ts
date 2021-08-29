import {
  GraphQLResolveInfo,
  SelectionSetNode,
  GraphQLObjectType,
  responsePathAsArray,
  GraphQLError,
  locatedError,
  GraphQLSchema,
  FieldNode,
} from 'graphql';

import { collectFields, relocatedError } from '@graphql-tools/utils';

import { ExternalObject, MergedTypeInfo, StitchingInfo, SubschemaConfig } from './types';
import { FIELD_SUBSCHEMA_MAP_SYMBOL, OBJECT_SUBSCHEMA_SYMBOL, UNPATHED_ERRORS_SYMBOL } from './symbols';
import { Subschema } from './Subschema';
import { memoize4 } from './memoize';

export function isExternalObject(data: any): data is ExternalObject {
  return data[UNPATHED_ERRORS_SYMBOL] !== undefined;
}

export function annotateExternalObject(
  object: any,
  errors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig | undefined
): ExternalObject {
  Object.defineProperties(object, {
    [OBJECT_SUBSCHEMA_SYMBOL]: { value: subschema },
    [FIELD_SUBSCHEMA_MAP_SYMBOL]: { value: Object.create(null) },
    [UNPATHED_ERRORS_SYMBOL]: { value: errors },
  });
  return object;
}

export function getSubschema(object: ExternalObject, responseKey: string): GraphQLSchema | SubschemaConfig {
  return object[FIELD_SUBSCHEMA_MAP_SYMBOL][responseKey] ?? object[OBJECT_SUBSCHEMA_SYMBOL];
}

export function getUnpathedErrors(object: ExternalObject): Array<GraphQLError> {
  return object[UNPATHED_ERRORS_SYMBOL];
}

export async function mergeFields(
  mergedTypeInfo: MergedTypeInfo,
  object: any,
  sourceSubschema: Subschema<any, any, any, any>,
  targetSubschemas: Array<Subschema<any, any, any, any>>,
  context: any,
  info: GraphQLResolveInfo
): Promise<any> {
  const delegationMaps = buildDelegationPlanFromInfo(info, mergedTypeInfo, sourceSubschema, targetSubschemas);

  for (const delegationMap of delegationMaps) {
    object = await executeDelegationStage(mergedTypeInfo, delegationMap, object, context, info);
  }

  return object;
}

async function executeDelegationStage(
  mergedTypeInfo: MergedTypeInfo,
  delegationMap: Map<Subschema, SelectionSetNode>,
  object: ExternalObject,
  context: any,
  info: GraphQLResolveInfo
): Promise<any> {
  const combinedErrors = object[UNPATHED_ERRORS_SYMBOL] ?? [];

  const path = responsePathAsArray(info.path);

  const newFieldSubschemaMap = object[FIELD_SUBSCHEMA_MAP_SYMBOL] ?? Object.create(null);

  const type = info.schema.getType(object.__typename) as GraphQLObjectType;

  const results = await Promise.all(
    [...delegationMap.entries()].map(async ([s, selectionSet]) => {
      const resolver = mergedTypeInfo.resolvers.get(s);
      if (resolver) {
        let source: any;
        try {
          source = await resolver(object, context, info, s, selectionSet);
        } catch (error: any) {
          source = error;
        }
        if (source instanceof Error || source == null) {
          const fieldNodeResponseKeyMap = collectFields(info.schema, {}, {}, type, selectionSet, new Map(), new Set());
          const nullResult = {};
          for (const [responseKey, fieldNodes] of fieldNodeResponseKeyMap) {
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
          newFieldSubschemaMap[responseKey] = fieldSubschemaMap?.[responseKey] ?? objectSubschema;
        }

        return source;
      }
    })
  );

  const combinedResult: ExternalObject = Object.assign(Object.create(null), object, ...results);

  combinedResult[FIELD_SUBSCHEMA_MAP_SYMBOL] = newFieldSubschemaMap;
  combinedResult[OBJECT_SUBSCHEMA_SYMBOL] = object[OBJECT_SUBSCHEMA_SYMBOL];

  combinedResult[UNPATHED_ERRORS_SYMBOL] = combinedErrors;

  return combinedResult;
}

const buildDelegationPlanFromInfo = memoize4(function buildDelegationPlanFromInfo(
  info: GraphQLResolveInfo,
  mergedTypeInfo: MergedTypeInfo,
  sourceSubschema: Subschema<any, any, any, any>,
  targetSubschemas: Array<Subschema<any, any, any, any>>
): Array<Map<Subschema, SelectionSetNode>> {
  const { schema, fragments, variableValues, fieldNodes } = info;

  return mergedTypeInfo.delegationPlanBuilder(
    schema,
    sourceSubschema,
    fieldNodes as FieldNode[],
    fragments,
    variableValues,
    schema.extensions?.['stitchingInfo'] as StitchingInfo,
    mergedTypeInfo,
    targetSubschemas
  );
});
