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

import { ExternalObject, MergedTypeInfo, SubschemaConfig } from './types';
import { FIELD_SUBSCHEMA_MAP_SYMBOL, OBJECT_SUBSCHEMA_SYMBOL, UNPATHED_ERRORS_SYMBOL } from './symbols';
import { Subschema } from './Subschema';

export function isExternalObject(data: any): data is ExternalObject {
  return data[UNPATHED_ERRORS_SYMBOL] !== undefined;
}

export function annotateExternalObject<TContext>(
  object: any,
  errors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig<any, any, any, TContext> | undefined,
  subschemaMap: Record<string, GraphQLSchema | SubschemaConfig<any, any, any, Record<string, any>>>
): ExternalObject {
  Object.defineProperties(object, {
    [OBJECT_SUBSCHEMA_SYMBOL]: { value: subschema },
    [FIELD_SUBSCHEMA_MAP_SYMBOL]: { value: subschemaMap },
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

const EMPTY_ARRAY: any[] = [];
const EMPTY_OBJECT = Object.create(null);

export async function mergeFields(
  mergedTypeInfo: MergedTypeInfo,
  object: any,
  sourceSubschema: Subschema<any, any, any, any>,
  context: any,
  info: GraphQLResolveInfo
): Promise<any> {
  const delegationMaps = mergedTypeInfo.delegationPlanBuilder(
    info.schema,
    sourceSubschema,
    info.variableValues != null && Object.keys(info.variableValues).length > 0 ? info.variableValues : EMPTY_OBJECT,
    info.fragments != null && Object.keys(info.fragments).length > 0 ? info.fragments : EMPTY_OBJECT,
    info.fieldNodes?.length ? (info.fieldNodes as FieldNode[]) : EMPTY_ARRAY
  );

  for (const delegationMap of delegationMaps) {
    await executeDelegationStage(mergedTypeInfo, delegationMap, object, context, info);
  }

  return object;
}

async function executeDelegationStage(
  mergedTypeInfo: MergedTypeInfo,
  delegationMap: Map<Subschema, SelectionSetNode>,
  object: ExternalObject,
  context: any,
  info: GraphQLResolveInfo
): Promise<void> {
  const combinedErrors = object[UNPATHED_ERRORS_SYMBOL];

  const path = responsePathAsArray(info.path);

  const combinedFieldSubschemaMap = object[FIELD_SUBSCHEMA_MAP_SYMBOL];

  const type = info.schema.getType(object.__typename) as GraphQLObjectType;

  await Promise.all(
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
          object[responseKey] = source[responseKey];
          combinedFieldSubschemaMap[responseKey] = fieldSubschemaMap?.[responseKey] ?? objectSubschema;
        }
      }
    })
  );
}
