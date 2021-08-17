import {
  GraphQLObjectType,
  GraphQLSchema,
  Kind,
  SelectionSetNode,
  isObjectType,
  getNamedType,
  GraphQLInterfaceType,
  print,
  isInterfaceType,
  isLeafType,
  FieldNode,
  isInputObjectType,
  isUnionType,
} from 'graphql';

import { parseSelectionSet, IResolvers, IFieldResolverOptions, isSome } from '@graphql-tools/utils';

import { MergedTypeResolver, Subschema, SubschemaConfig, MergedTypeInfo, StitchingInfo } from '@graphql-tools/delegate';

import { MergeTypeCandidate, MergeTypeFilter } from './types';

import { createMergedTypeResolver } from './createMergedTypeResolver';
import { collectFields, ExecutionContext } from 'graphql/execution/execute.js';
import { TypeMap } from 'graphql/type/schema';
import { buildDelegationPlan, createDelegationPlanBuilder } from './buildDelegationPlan';

export function createStitchingInfo<TContext = Record<string, any>>(
  subschemaMap: Map<GraphQLSchema | SubschemaConfig<any, any, any, TContext>, Subschema<any, any, any, TContext>>,
  typeCandidates: Record<string, Array<MergeTypeCandidate<TContext>>>,
  mergeTypes?: boolean | Array<string> | MergeTypeFilter<TContext>
): StitchingInfo<TContext> {
  const mergedTypes = createMergedTypes(typeCandidates, mergeTypes);

  return {
    subschemaMap,
    fieldNodesByType: Object.create(null),
    fieldNodesByField: Object.create(null),
    dynamicSelectionSetsByField: Object.create(null),
    mergedTypes,
  };
}

function createMergedTypes<TContext = Record<string, any>>(
  typeCandidates: Record<string, Array<MergeTypeCandidate<TContext>>>,
  mergeTypes?: boolean | Array<string> | MergeTypeFilter<TContext>
): Record<string, MergedTypeInfo<TContext>> {
  const mergedTypes: Record<string, MergedTypeInfo<TContext>> = Object.create(null);

  for (const typeName in typeCandidates) {
    if (
      typeCandidates[typeName].length > 1 &&
      (isObjectType(typeCandidates[typeName][0].type) || isInterfaceType(typeCandidates[typeName][0].type))
    ) {
      const typeCandidatesWithMergedTypeConfig = typeCandidates[typeName].filter(
        typeCandidate =>
          typeCandidate.transformedSubschema != null &&
          typeCandidate.transformedSubschema.merge != null &&
          typeName in typeCandidate.transformedSubschema.merge
      );

      if (
        mergeTypes === true ||
        (typeof mergeTypes === 'function' && mergeTypes(typeCandidates[typeName], typeName)) ||
        (Array.isArray(mergeTypes) && mergeTypes.includes(typeName)) ||
        typeCandidatesWithMergedTypeConfig.length
      ) {
        const targetSubschemas: Array<Subschema<any, any, any, TContext>> = [];

        const typeMaps: Map<GraphQLSchema | SubschemaConfig<any, any, any, TContext>, TypeMap> = new Map();
        const supportedBySubschemas: Record<string, Array<Subschema<any, any, any, TContext>>> = Object.create({});
        const selectionSets: Map<Subschema<any, any, any, TContext>, SelectionSetNode> = new Map();
        const fieldSelectionSets: Map<Subschema<any, any, any, TContext>, Record<string, SelectionSetNode>> = new Map();
        const resolvers: Map<Subschema<any, any, any, TContext>, MergedTypeResolver<TContext>> = new Map();

        for (const typeCandidate of typeCandidates[typeName]) {
          const subschema = typeCandidate.transformedSubschema;

          if (subschema == null) {
            continue;
          }

          typeMaps.set(subschema, subschema.transformedSchema.getTypeMap());

          const mergedTypeConfig = subschema?.merge?.[typeName];

          if (mergedTypeConfig == null) {
            continue;
          }

          if (mergedTypeConfig.selectionSet) {
            const selectionSet = parseSelectionSet(mergedTypeConfig.selectionSet, { noLocation: true });
            selectionSets.set(subschema, selectionSet);
          }

          if (mergedTypeConfig.fields) {
            const parsedFieldSelectionSets = Object.create(null);
            for (const fieldName in mergedTypeConfig.fields) {
              if (mergedTypeConfig.fields[fieldName].selectionSet) {
                const rawFieldSelectionSet = mergedTypeConfig.fields[fieldName].selectionSet;
                parsedFieldSelectionSets[fieldName] = rawFieldSelectionSet
                  ? parseSelectionSet(rawFieldSelectionSet, { noLocation: true })
                  : undefined;
              }
            }
            fieldSelectionSets.set(subschema, parsedFieldSelectionSets);
          }

          const resolver = mergedTypeConfig.resolve ?? createMergedTypeResolver(mergedTypeConfig);

          if (resolver == null) {
            continue;
          }

          const keyFn = mergedTypeConfig.key;
          resolvers.set(
            subschema,
            keyFn
              ? (originalResult, context, info, subschema, selectionSet) => {
                  const key = keyFn(originalResult);
                  return resolver(originalResult, context, info, subschema, selectionSet, key);
                }
              : resolver
          );

          targetSubschemas.push(subschema);

          const type = subschema.transformedSchema.getType(typeName) as GraphQLObjectType | GraphQLInterfaceType;
          const fieldMap = type.getFields();
          const selectionSet = selectionSets.get(subschema);
          for (const fieldName in fieldMap) {
            const field = fieldMap[fieldName];
            const fieldType = getNamedType(field.type);
            if (selectionSet && isLeafType(fieldType) && selectionSetContainsTopLevelField(selectionSet, fieldName)) {
              continue;
            }
            if (!(fieldName in supportedBySubschemas)) {
              supportedBySubschemas[fieldName] = [];
            }
            supportedBySubschemas[fieldName].push(subschema);
          }
        }

        const sourceSubschemas = typeCandidates[typeName]
          .map(typeCandidate => typeCandidate?.transformedSubschema)
          .filter(isSome);
        const targetSubschemasBySubschema: Map<
          Subschema<any, any, any, TContext>,
          Array<Subschema<any, any, any, TContext>>
        > = new Map();
        for (const subschema of sourceSubschemas) {
          const filteredSubschemas = targetSubschemas.filter(s => s !== subschema);
          if (filteredSubschemas.length) {
            targetSubschemasBySubschema.set(subschema, filteredSubschemas);
          }
        }

        mergedTypes[typeName] = {
          typeName,
          targetSubschemas: targetSubschemasBySubschema,
          typeMaps,
          selectionSets,
          fieldSelectionSets,
          uniqueFields: Object.create({}),
          nonUniqueFields: Object.create({}),
          resolvers,
          delegationPlanBuilder: createDelegationPlanBuilder(typeName),
        };

        for (const fieldName in supportedBySubschemas) {
          if (supportedBySubschemas[fieldName].length === 1) {
            mergedTypes[typeName].uniqueFields[fieldName] = supportedBySubschemas[fieldName][0];
          } else {
            mergedTypes[typeName].nonUniqueFields[fieldName] = supportedBySubschemas[fieldName];
          }
        }
      }
    }
  }

  return mergedTypes;
}

export function completeStitchingInfo<TContext = Record<string, any>>(
  stitchingInfo: StitchingInfo<TContext>,
  resolvers: IResolvers,
  schema: GraphQLSchema
): StitchingInfo<TContext> {
  const { fieldNodesByType, fieldNodesByField, dynamicSelectionSetsByField, mergedTypes } = stitchingInfo;

  // must add __typename to query and mutation root types to handle type merging with nested root types
  // cannot add __typename to subscription root types, but they cannot be nested
  const rootTypes = [schema.getQueryType(), schema.getMutationType()];
  for (const rootType of rootTypes) {
    if (rootType) {
      fieldNodesByType[rootType.name] = [
        parseSelectionSet('{ __typename }', { noLocation: true }).selections[0] as FieldNode,
      ];
    }
  }

  const selectionSetsByField: Record<string, Record<string, Array<SelectionSetNode>>> = Object.create(null);
  for (const typeName in mergedTypes) {
    const mergedTypeInfo = mergedTypes[typeName];
    if (mergedTypeInfo.selectionSets == null && mergedTypeInfo.fieldSelectionSets == null) {
      continue;
    }

    for (const [subschemaConfig, selectionSet] of mergedTypeInfo.selectionSets) {
      const schema = subschemaConfig.transformedSchema;
      const type = schema.getType(typeName) as GraphQLObjectType;
      const fields = type.getFields();
      for (const fieldName in fields) {
        const field = fields[fieldName];
        const fieldType = getNamedType(field.type);
        if (selectionSet && isLeafType(fieldType) && selectionSetContainsTopLevelField(selectionSet, fieldName)) {
          continue;
        }
        updateSelectionSetMap(selectionSetsByField, typeName, fieldName, selectionSet, true);
      }
    }

    for (const [, selectionSetFieldMap] of mergedTypeInfo.fieldSelectionSets) {
      for (const fieldName in selectionSetFieldMap) {
        const selectionSet = selectionSetFieldMap[fieldName];
        updateSelectionSetMap(selectionSetsByField, typeName, fieldName, selectionSet, true);
      }
    }
  }

  for (const typeName in resolvers) {
    const type = schema.getType(typeName);
    if (type === undefined || isLeafType(type) || isInputObjectType(type) || isUnionType(type)) {
      continue;
    }
    const resolver = resolvers[typeName];
    for (const fieldName in resolver) {
      const field = resolver[fieldName] as IFieldResolverOptions;
      if (typeof field.selectionSet === 'function') {
        if (!(typeName in dynamicSelectionSetsByField)) {
          dynamicSelectionSetsByField[typeName] = Object.create(null);
        }

        if (!(fieldName in dynamicSelectionSetsByField[typeName])) {
          dynamicSelectionSetsByField[typeName][fieldName] = [];
        }

        dynamicSelectionSetsByField[typeName][fieldName].push(field.selectionSet);
      } else if (field.selectionSet) {
        const selectionSet = parseSelectionSet(field.selectionSet, { noLocation: true });
        updateSelectionSetMap(selectionSetsByField, typeName, fieldName, selectionSet);
      }
    }
  }

  const partialExecutionContext = {
    schema,
    variableValues: Object.create(null),
    fragments: Object.create(null),
  } as ExecutionContext;

  const fieldNodeMap = Object.create(null);

  for (const typeName in selectionSetsByField) {
    const type = schema.getType(typeName) as GraphQLObjectType;
    for (const fieldName in selectionSetsByField[typeName]) {
      for (const selectionSet of selectionSetsByField[typeName][fieldName]) {
        const fieldNodes = collectFields(
          partialExecutionContext,
          type,
          selectionSet,
          Object.create(null),
          Object.create(null)
        );

        for (const responseKey in fieldNodes) {
          for (const fieldNode of fieldNodes[responseKey]) {
            const key = print(fieldNode);
            if (fieldNodeMap[key] == null) {
              fieldNodeMap[key] = fieldNode;
              updateArrayMap(fieldNodesByField, typeName, fieldName, fieldNode);
            } else {
              updateArrayMap(fieldNodesByField, typeName, fieldName, fieldNodeMap[key]);
            }
          }
        }
      }
    }
  }

  return stitchingInfo;
}

function updateSelectionSetMap(
  map: Record<string, Record<string, Array<SelectionSetNode>>>,
  typeName: string,
  fieldName: string,
  selectionSet: SelectionSetNode,
  includeTypename?: boolean
): void {
  if (includeTypename) {
    const typenameSelectionSet = parseSelectionSet('{ __typename }', { noLocation: true });
    updateArrayMap(map, typeName, fieldName, selectionSet, typenameSelectionSet);
    return;
  }

  updateArrayMap(map, typeName, fieldName, selectionSet);
}

function updateArrayMap<T>(
  map: Record<string, Record<string, Array<T>>>,
  typeName: string,
  fieldName: string,
  value: T,
  initialValue?: T
): void {
  if (map[typeName] == null) {
    const initialItems = initialValue === undefined ? [value] : [initialValue, value];
    map[typeName] = {
      [fieldName]: initialItems,
    };
  } else if (map[typeName][fieldName] == null) {
    const initialItems = initialValue === undefined ? [value] : [initialValue, value];
    map[typeName][fieldName] = initialItems;
  } else {
    map[typeName][fieldName].push(value);
  }
}

export function addStitchingInfo<TContext = Record<string, any>>(
  stitchedSchema: GraphQLSchema,
  stitchingInfo: StitchingInfo<TContext>
): GraphQLSchema {
  return new GraphQLSchema({
    ...stitchedSchema.toConfig(),
    extensions: {
      ...stitchedSchema.extensions,
      stitchingInfo,
    },
  });
}

export function selectionSetContainsTopLevelField(selectionSet: SelectionSetNode, fieldName: string) {
  return selectionSet.selections.some(selection => selection.kind === Kind.FIELD && selection.name.value === fieldName);
}
