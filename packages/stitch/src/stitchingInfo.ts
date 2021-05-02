import {
  GraphQLObjectType,
  GraphQLSchema,
  Kind,
  SelectionSetNode,
  isObjectType,
  getNamedType,
  GraphQLInterfaceType,
  SelectionNode,
  print,
  isInterfaceType,
  isLeafType,
  isUnionType,
  isInputObjectType,
  FieldNode,
  GraphQLField,
} from 'graphql';

import { parseSelectionSet, TypeMap, IResolvers, IFieldResolverOptions, collectFields, GraphQLExecutionContext } from '@graphql-tools/utils';

import { MergedTypeResolver, Subschema, SubschemaConfig, MergedTypeInfo, StitchingInfo } from '@graphql-tools/delegate';

import { MergeTypeCandidate, MergeTypeFilter } from './types';

import { createMergedTypeResolver } from './createMergedTypeResolver';

export function createStitchingInfo(
  subschemaMap: Map<GraphQLSchema | SubschemaConfig, Subschema>,
  typeCandidates: Record<string, Array<MergeTypeCandidate>>,
  mergeTypes?: boolean | Array<string> | MergeTypeFilter
): StitchingInfo {
  const mergedTypes = createMergedTypes(typeCandidates, mergeTypes);

  return {
    subschemaMap,
    fieldNodesByField: undefined,
    dynamicFieldNodesByField: undefined,
    mergedTypes,
  };
}

function createMergedTypes(
  typeCandidates: Record<string, Array<MergeTypeCandidate>>,
  mergeTypes?: boolean | Array<string> | MergeTypeFilter
): Record<string, MergedTypeInfo> {
  const mergedTypes: Record<string, MergedTypeInfo> = Object.create(null);

  Object.keys(typeCandidates).forEach(typeName => {
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
        const targetSubschemas: Array<Subschema> = [];

        const typeMaps: Map<GraphQLSchema | SubschemaConfig, TypeMap> = new Map();
        const supportedBySubschemas: Record<string, Array<Subschema>> = Object.create({});
        const selectionSets: Map<Subschema, SelectionSetNode> = new Map();
        const fieldSelectionSets: Map<Subschema, Record<string, SelectionSetNode>> = new Map();
        const resolvers: Map<Subschema, MergedTypeResolver> = new Map();

        typeCandidates[typeName].forEach(typeCandidate => {
          const subschema = typeCandidate.transformedSubschema;

          if (subschema == null) {
            return;
          }

          typeMaps.set(subschema, subschema.transformedSchema.getTypeMap());

          const mergedTypeConfig = subschema?.merge?.[typeName];

          if (mergedTypeConfig == null) {
            return;
          }

          if (mergedTypeConfig.selectionSet) {
            const selectionSet = parseSelectionSet(mergedTypeConfig.selectionSet, { noLocation: true });

            selectionSets.set(subschema, selectionSet);
          }

          if (mergedTypeConfig.fields) {
            const parsedFieldSelectionSets = Object.create(null);
            Object.keys(mergedTypeConfig.fields).forEach(fieldName => {
              if (mergedTypeConfig.fields[fieldName].selectionSet) {
                const rawFieldSelectionSet = mergedTypeConfig.fields[fieldName].selectionSet;
                parsedFieldSelectionSets[fieldName] = parseSelectionSet(rawFieldSelectionSet, { noLocation: true });
              }
            });
            fieldSelectionSets.set(subschema, parsedFieldSelectionSets);
          }

          const resolver = mergedTypeConfig.resolve ?? createMergedTypeResolver(mergedTypeConfig);

          if (resolver == null) {
            return;
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
          Object.keys(fieldMap).forEach(fieldName => {
            const field = fieldMap[fieldName];
            const fieldType = getNamedType(field.type);
            if (selectionSet && isLeafType(fieldType) && selectionSetContainsTopLevelField(selectionSet, fieldName)) {
              return;
            }
            if (!(fieldName in supportedBySubschemas)) {
              supportedBySubschemas[fieldName] = [];
            }
            supportedBySubschemas[fieldName].push(subschema);
          });
        });

        const sourceSubschemas = typeCandidates[typeName]
          .filter(typeCandidate => typeCandidate.transformedSubschema != null)
          .map(typeCandidate => typeCandidate.transformedSubschema);
        const targetSubschemasBySubschema: Map<Subschema, Array<Subschema>> = new Map();
        sourceSubschemas.forEach(subschema => {
          const filteredSubschemas = targetSubschemas.filter(s => s !== subschema);
          if (filteredSubschemas.length) {
            targetSubschemasBySubschema.set(subschema, filteredSubschemas);
          }
        });

        mergedTypes[typeName] = {
          typeName,
          targetSubschemas: targetSubschemasBySubschema,
          typeMaps,
          selectionSets,
          fieldSelectionSets,
          uniqueFields: Object.create({}),
          nonUniqueFields: Object.create({}),
          subschemaFields: Object.create({}),
          resolvers,
        };

        Object.keys(supportedBySubschemas).forEach(fieldName => {
          if (supportedBySubschemas[fieldName].length === 1) {
            mergedTypes[typeName].uniqueFields[fieldName] = supportedBySubschemas[fieldName][0];
          } else {
            mergedTypes[typeName].nonUniqueFields[fieldName] = supportedBySubschemas[fieldName];
          }
          mergedTypes[typeName].subschemaFields[fieldName] = true;
        });
      }
    }
  });

  return mergedTypes;
}

export function completeStitchingInfo(
  stitchingInfo: StitchingInfo,
  resolvers: IResolvers,
  schema: GraphQLSchema
): StitchingInfo {
  const selectionSetsByField: Record<string, Record<string, SelectionSetNode>> = Object.create(null);
  Object.entries(stitchingInfo.mergedTypes).forEach(([typeName, mergedTypeInfo]) => {
    if (mergedTypeInfo.selectionSets == null && mergedTypeInfo.fieldSelectionSets == null) {
      return;
    }

    selectionSetsByField[typeName] = Object.create(null);

    mergedTypeInfo.selectionSets.forEach((selectionSet, subschemaConfig) => {
      const schema = subschemaConfig.transformedSchema;
      const type = schema.getType(typeName) as GraphQLObjectType;
      const fields = type.getFields();
      Object.keys(fields).forEach(fieldName => {
        const field = fields[fieldName];
        const fieldType = getNamedType(field.type);
        if (selectionSet && isLeafType(fieldType) && selectionSetContainsTopLevelField(selectionSet, fieldName)) {
          return;
        }

        const typeSelectionSets = selectionSetsByField[typeName];
        if (typeSelectionSets[fieldName] == null) {
          typeSelectionSets[fieldName] = {
            kind: Kind.SELECTION_SET,
            selections: [],
          };
        }

        const fieldSelectionSet = selectionSetsByField[typeName][fieldName];

        fieldSelectionSet.selections = fieldSelectionSet.selections.concat(selectionSet.selections);
      });
    });

    mergedTypeInfo.fieldSelectionSets.forEach(selectionSetFieldMap => {
      Object.keys(selectionSetFieldMap).forEach(fieldName => {
        const typeSelectionSets = selectionSetsByField[typeName];
        if (typeSelectionSets[fieldName] == null) {
          typeSelectionSets[fieldName] = {
            kind: Kind.SELECTION_SET,
            selections: [],
          };
        }

        const fieldSelectionSet = selectionSetsByField[typeName][fieldName];
        fieldSelectionSet.selections = fieldSelectionSet.selections.concat(selectionSetFieldMap[fieldName].selections);
      });
    });
  });

  const dynamicFieldNodesByField:Record<string, Record<string, Array<(fieldNode: FieldNode) => Array<FieldNode>>>> = Object.create(null);

  Object.keys(resolvers).forEach(typeName => {
    const typeEntry = resolvers[typeName];
    const type = schema.getType(typeName);
    if (isLeafType(type) || isUnionType(type) || isInputObjectType(type)) {
      return;
    }

    Object.keys(typeEntry).forEach(fieldName => {
      const field = typeEntry[fieldName] as IFieldResolverOptions;
      if (field.selectionSet) {
        if (typeof field.selectionSet === 'function') {
          if (!(typeName in dynamicFieldNodesByField)) {
            dynamicFieldNodesByField[typeName] = Object.create(null);
          }

          if (!(fieldName in dynamicFieldNodesByField[typeName])) {
            dynamicFieldNodesByField[typeName][fieldName] = [];
          }

          const buildFieldNodeFn = field.selectionSet as ((schema: GraphQLSchema, field: GraphQLField<any, any>) => (originalFieldNode: FieldNode) => Array<FieldNode>);
          const fieldNodeFn = buildFieldNodeFn(schema, type.getFields()[fieldName]);
          dynamicFieldNodesByField[typeName][fieldName].push((fieldNode: FieldNode) => fieldNodeFn(fieldNode));
        } else {
          const selectionSet = parseSelectionSet(field.selectionSet, { noLocation: true });
          if (!(typeName in selectionSetsByField)) {
            selectionSetsByField[typeName] = Object.create(null);
          }

          const typeSelectionSets = selectionSetsByField[typeName];
          if (!(fieldName in typeSelectionSets)) {
            typeSelectionSets[fieldName] = {
              kind: Kind.SELECTION_SET,
              selections: [],
            };
          }

          const fieldSelectionSet = typeSelectionSets[fieldName];
          fieldSelectionSet.selections = fieldSelectionSet.selections.concat(selectionSet.selections);
        }
      }
    });
  });

  const partialExecutionContext = ({
    schema,
    variableValues: Object.create(null),
    fragments: Object.create(null),
  } as unknown) as GraphQLExecutionContext;

  const fieldNodesByField: Record<string, Record<string, Array<FieldNode>>> = Object.create(null);
  Object.keys(selectionSetsByField).forEach(typeName => {
    const typeFieldNodes: Record<string, Array<FieldNode>> = Object.create(null);
    fieldNodesByField[typeName] = typeFieldNodes;

    const type = schema.getType(typeName) as GraphQLObjectType;
    const typeSelectionSets = selectionSetsByField[typeName];
    Object.keys(typeSelectionSets).forEach(fieldName => {

      const consolidatedSelections: Map<string, SelectionNode> = new Map();
      const selectionSet = typeSelectionSets[fieldName];
      selectionSet.selections.forEach(selection => consolidatedSelections.set(print(selection), selection));

      const responseKeys = collectFields(
        partialExecutionContext,
        type,
        {
          kind: Kind.SELECTION_SET,
          selections: Array.from(consolidatedSelections.values())
        },
        Object.create(null),
        Object.create(null)
      );

      const fieldNodes: Array<FieldNode> = [];
      typeFieldNodes[fieldName] = fieldNodes;
      Object.values(responseKeys).forEach(nodes => fieldNodes.push(...nodes));
    });
  });

  stitchingInfo.fieldNodesByField = fieldNodesByField;
  stitchingInfo.dynamicFieldNodesByField = dynamicFieldNodesByField;

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

export function selectionSetContainsTopLevelField(selectionSet: SelectionSetNode, fieldName: string) {
  return selectionSet.selections.some(selection => selection.kind === Kind.FIELD && selection.name.value === fieldName);
}
