import {
  GraphQLObjectType,
  GraphQLSchema,
  Kind,
  SelectionSetNode,
  isObjectType,
  isScalarType,
  getNamedType,
  GraphQLOutputType,
  GraphQLInterfaceType,
} from 'graphql';

import {
  parseFragmentToInlineFragment,
  concatInlineFragments,
  parseSelectionSet,
  TypeMap,
  IResolvers,
  IFieldResolverOptions,
} from '@graphql-tools/utils';

import { delegateToSchema, isSubschemaConfig, SubschemaConfig } from '@graphql-tools/delegate';

import { batchDelegateToSchema } from '@graphql-tools/batch-delegate';

import { MergeTypeCandidate, MergedTypeInfo, StitchingInfo, MergeTypeFilter } from './types';

export function createStitchingInfo(
  transformedSchemas: Map<GraphQLSchema | SubschemaConfig, GraphQLSchema>,
  typeCandidates: Record<string, Array<MergeTypeCandidate>>,
  mergeTypes?: boolean | Array<string> | MergeTypeFilter
): StitchingInfo {
  const mergedTypes = createMergedTypes(typeCandidates, mergeTypes);
  const selectionSetsByField: Record<string, Record<string, SelectionSetNode>> = Object.entries(mergedTypes).reduce(
    (acc, [typeName, mergedTypeInfo]) => {
      if (mergedTypeInfo.selectionSets == null) {
        return;
      }

      acc[typeName] = Object.create(null);

      mergedTypeInfo.selectionSets.forEach((selectionSet, subschemaConfig) => {
        const schema = subschemaConfig.schema;
        const fields = (schema.getType(typeName) as GraphQLObjectType | GraphQLInterfaceType).getFields();
        Object.keys(fields).forEach(fieldName => {
          if (acc[typeName][fieldName] == null) {
            acc[typeName][fieldName] = {
              kind: Kind.SELECTION_SET,
              selections: [parseSelectionSet('{ __typename }').selections[0]],
            };
          }
          acc[typeName][fieldName].selections = acc[typeName][fieldName].selections.concat(selectionSet.selections);
        });
      });
      return acc;
    },
    Object.create(null)
  );

  return {
    transformedSchemas,
    fragmentsByField: undefined,
    selectionSetsByField,
    dynamicSelectionSetsByField: undefined,
    mergedTypes,
  };
}

function createMergedTypes(
  typeCandidates: Record<string, Array<MergeTypeCandidate>>,
  mergeTypes?: boolean | Array<string> | MergeTypeFilter
): Record<string, MergedTypeInfo> {
  const mergedTypes: Record<string, MergedTypeInfo> = Object.create(null);

  Object.keys(typeCandidates).forEach(typeName => {
    if (isObjectType(typeCandidates[typeName][0].type) && typeCandidates[typeName].length > 1) {
      const typeCandidatesWithMergedTypeConfig = typeCandidates[typeName].filter(
        typeCandidate =>
          typeCandidate.subschema != null &&
          isSubschemaConfig(typeCandidate.subschema) &&
          typeCandidate.subschema.merge != null &&
          typeName in typeCandidate.subschema.merge
      );

      if (
        mergeTypes === true ||
        (typeof mergeTypes === 'function' && mergeTypes(typeCandidates[typeName], typeName)) ||
        (Array.isArray(mergeTypes) && mergeTypes.includes(typeName)) ||
        typeCandidatesWithMergedTypeConfig.length
      ) {
        const targetSubschemas: Array<SubschemaConfig> = [];

        const typeMaps: Map<GraphQLSchema | SubschemaConfig, TypeMap> = new Map();
        const supportedBySubschemas: Record<string, Array<SubschemaConfig>> = Object.create({});
        const selectionSets: Map<SubschemaConfig, SelectionSetNode> = new Map();

        typeCandidates[typeName].forEach(typeCandidate => {
          const subschema = typeCandidate.subschema;

          if (subschema == null) {
            return;
          }

          const transformedSubschema = typeCandidate.transformedSubschema;
          typeMaps.set(subschema, transformedSubschema.getTypeMap());

          if (!isSubschemaConfig(subschema)) {
            return;
          }

          const mergedTypeConfig = subschema?.merge?.[typeName];

          if (mergedTypeConfig == null) {
            return;
          }

          if (mergedTypeConfig.selectionSet) {
            const selectionSet = parseSelectionSet(mergedTypeConfig.selectionSet);
            selectionSets.set(subschema, selectionSet);
          }

          if (mergedTypeConfig.resolve != null) {
            targetSubschemas.push(subschema);
          } else if (mergedTypeConfig.key != null) {
            mergedTypeConfig.resolve = (originalResult, context, info, subschema, selectionSet) =>
              batchDelegateToSchema({
                schema: subschema,
                operation: 'query',
                fieldName: mergedTypeConfig.fieldName,
                key: mergedTypeConfig.key(originalResult),
                argsFromKeys: mergedTypeConfig.argsFromKeys ?? mergedTypeConfig.args,
                valuesFromResults: mergedTypeConfig.valuesFromResults,
                selectionSet,
                context,
                info,
                skipTypeMerging: true,
              });

            targetSubschemas.push(subschema);
          } else if (mergedTypeConfig.fieldName != null) {
            mergedTypeConfig.resolve = (originalResult, context, info, subschema, selectionSet) =>
              delegateToSchema({
                schema: subschema,
                operation: 'query',
                fieldName: mergedTypeConfig.fieldName,
                returnType: getNamedType(info.returnType) as GraphQLOutputType,
                args: mergedTypeConfig.args(originalResult),
                selectionSet,
                context,
                info,
                skipTypeMerging: true,
              });

            targetSubschemas.push(subschema);
          }

          if (mergedTypeConfig.resolve == null) {
            return;
          }

          const type = transformedSubschema.getType(typeName) as GraphQLObjectType;
          const fieldMap = type.getFields();
          Object.keys(fieldMap).forEach(fieldName => {
            if (!(fieldName in supportedBySubschemas)) {
              supportedBySubschemas[fieldName] = [];
            }
            supportedBySubschemas[fieldName].push(subschema);
          });
        });

        const sourceSubschemas = typeCandidates[typeName]
          .filter(typeCandidate => typeCandidate.subschema != null)
          .map(typeCandidate => typeCandidate.subschema);
        const targetSubschemasBySubschema: Map<GraphQLSchema | SubschemaConfig, Array<SubschemaConfig>> = new Map();
        sourceSubschemas.forEach(subschema => {
          const filteredSubschemas = targetSubschemas.filter(s => s !== subschema);
          if (filteredSubschemas.length) {
            targetSubschemasBySubschema.set(subschema, filteredSubschemas);
          }
        });

        mergedTypes[typeName] = {
          targetSubschemas: targetSubschemasBySubschema,
          typeMaps,
          selectionSets,
          uniqueFields: Object.create({}),
          nonUniqueFields: Object.create({}),
        };

        Object.keys(supportedBySubschemas).forEach(fieldName => {
          if (supportedBySubschemas[fieldName].length === 1) {
            mergedTypes[typeName].uniqueFields[fieldName] = supportedBySubschemas[fieldName][0];
          } else {
            mergedTypes[typeName].nonUniqueFields[fieldName] = supportedBySubschemas[fieldName];
          }
        });
      }
    }
  });

  return mergedTypes;
}

export function completeStitchingInfo(stitchingInfo: StitchingInfo, resolvers: IResolvers): StitchingInfo {
  const selectionSetsByField = stitchingInfo.selectionSetsByField;
  const dynamicSelectionSetsByField = Object.create(null);
  const rawFragments: Array<{ field: string; fragment: string }> = [];

  Object.keys(resolvers).forEach(typeName => {
    const type = resolvers[typeName];
    if (isScalarType(type)) {
      return;
    }
    Object.keys(type).forEach(fieldName => {
      const field = type[fieldName] as IFieldResolverOptions;
      if (field.selectionSet) {
        if (typeof field.selectionSet === 'function') {
          if (!(typeName in dynamicSelectionSetsByField)) {
            dynamicSelectionSetsByField[typeName] = Object.create(null);
          }

          if (!(fieldName in dynamicSelectionSetsByField[typeName])) {
            dynamicSelectionSetsByField[typeName][fieldName] = [];
          }

          dynamicSelectionSetsByField[typeName][fieldName].push(field.selectionSet);
        } else {
          const selectionSet = parseSelectionSet(field.selectionSet);
          if (!(typeName in selectionSetsByField)) {
            selectionSetsByField[typeName] = Object.create(null);
          }

          if (!(fieldName in selectionSetsByField[typeName])) {
            selectionSetsByField[typeName][fieldName] = {
              kind: Kind.SELECTION_SET,
              selections: [],
            };
          }
          selectionSetsByField[typeName][fieldName].selections = selectionSetsByField[typeName][
            fieldName
          ].selections.concat(selectionSet.selections);
        }
      }
      if (field.fragment) {
        rawFragments.push({
          field: fieldName,
          fragment: field.fragment,
        });
      }
    });
  });

  const parsedFragments = Object.create(null);
  rawFragments.forEach(({ field, fragment }) => {
    const parsedFragment = parseFragmentToInlineFragment(fragment);
    const actualTypeName = parsedFragment.typeCondition.name.value;
    if (!(actualTypeName in parsedFragments)) {
      parsedFragments[actualTypeName] = Object.create(null);
    }

    if (!(field in parsedFragments[actualTypeName])) {
      parsedFragments[actualTypeName][field] = [];
    }
    parsedFragments[actualTypeName][field].push(parsedFragment);
  });

  const fragmentsByField = Object.create(null);
  Object.keys(parsedFragments).forEach(typeName => {
    Object.keys(parsedFragments[typeName]).forEach(field => {
      if (!(typeName in fragmentsByField)) {
        fragmentsByField[typeName] = Object.create(null);
      }

      fragmentsByField[typeName][field] = concatInlineFragments(typeName, parsedFragments[typeName][field]);
    });
  });

  stitchingInfo.selectionSetsByField = selectionSetsByField;
  stitchingInfo.dynamicSelectionSetsByField = dynamicSelectionSetsByField;
  stitchingInfo.fragmentsByField = fragmentsByField;

  return stitchingInfo;
}

export function addStitchingInfo(stitchedSchema: GraphQLSchema, stitchingInfo: StitchingInfo): GraphQLSchema {
  return new GraphQLSchema({
    ...stitchedSchema.toConfig(),
    extensions: {
      ...stitchedSchema.extensions,
      stitchingInfo,
    },
  });
}
