import {
  FieldNode,
  getNamedType,
  GraphQLInterfaceType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLSchema,
  isAbstractType,
  isInputObjectType,
  isInterfaceType,
  isLeafType,
  isObjectType,
  isUnionType,
  Kind,
  print,
  SelectionSetNode,
} from 'graphql';
import { ValueOrPromise } from 'value-or-promise';
import {
  MergedTypeInfo,
  MergedTypeResolver,
  StitchingInfo,
  Subschema,
  SubschemaConfig,
} from '@graphql-tools/delegate';
import {
  collectFields,
  IFieldResolverOptions,
  IResolvers,
  isSome,
  parseSelectionSet,
} from '@graphql-tools/utils';
import { createDelegationPlanBuilder } from './createDelegationPlanBuilder.js';
import { createMergedTypeResolver } from './createMergedTypeResolver.js';
import { MergeTypeCandidate, MergeTypeFilter } from './types.js';

export function createStitchingInfo<TContext extends Record<string, any> = Record<string, any>>(
  subschemaMap: Map<
    GraphQLSchema | SubschemaConfig<any, any, any, TContext>,
    Subschema<any, any, any, TContext>
  >,
  typeCandidates: Record<string, Array<MergeTypeCandidate<TContext>>>,
  mergeTypes?: boolean | Array<string> | MergeTypeFilter<TContext>,
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

function createMergedTypes<TContext extends Record<string, any> = Record<string, any>>(
  typeCandidates: Record<string, Array<MergeTypeCandidate<TContext>>>,
  mergeTypes?: boolean | Array<string> | MergeTypeFilter<TContext>,
): Record<string, MergedTypeInfo<TContext>> {
  const mergedTypes: Record<string, MergedTypeInfo<TContext>> = Object.create(null);

  const typeInterfacesMap: Record<string, Set<string>> = Object.create(null);

  for (const typeName in typeCandidates) {
    for (const { type } of typeCandidates[typeName]) {
      if ('getInterfaces' in type) {
        const interfaces = type.getInterfaces();
        for (const iface of interfaces) {
          const interfaceName = iface.name;
          let implementingTypes = typeInterfacesMap[typeName];
          if (implementingTypes == null) {
            implementingTypes = new Set();
            typeInterfacesMap[typeName] = implementingTypes;
          }
          implementingTypes.add(interfaceName);
        }
      }
    }
  }

  for (const typeName in typeCandidates) {
    if (
      isObjectType(typeCandidates[typeName][0].type) ||
      isInterfaceType(typeCandidates[typeName][0].type)
    ) {
      const typeCandidatesWithMergedTypeConfig = typeCandidates[typeName].filter(
        typeCandidate =>
          typeCandidate.transformedSubschema != null &&
          typeCandidate.transformedSubschema.merge != null &&
          typeName in typeCandidate.transformedSubschema.merge,
      );

      if (
        mergeTypes === true ||
        (typeof mergeTypes === 'function' && mergeTypes(typeCandidates[typeName], typeName)) ||
        (Array.isArray(mergeTypes) && mergeTypes.includes(typeName)) ||
        typeCandidatesWithMergedTypeConfig.length
      ) {
        const targetSubschemas: Array<Subschema<any, any, any, TContext>> = [];

        const typeMaps: Map<
          GraphQLSchema | SubschemaConfig<any, any, any, TContext>,
          Record<string, GraphQLNamedType>
        > = new Map();
        const supportedBySubschemas: Record<
          string,
          Array<Subschema<any, any, any, TContext>>
        > = Object.create({});
        const selectionSets: Map<Subschema<any, any, any, TContext>, SelectionSetNode> = new Map();
        const fieldSelectionSets: Map<
          Subschema<any, any, any, TContext>,
          Record<string, SelectionSetNode>
        > = new Map();
        const resolvers: Map<
          Subschema<any, any, any, TContext>,
          MergedTypeResolver<TContext>
        > = new Map();

        for (const typeCandidate of typeCandidates[typeName]) {
          const subschema = typeCandidate.transformedSubschema;

          if (subschema == null) {
            continue;
          }

          typeMaps.set(subschema, subschema.transformedSchema.getTypeMap());

          let mergedTypeConfig = subschema?.merge?.[typeName];

          if (!mergedTypeConfig) {
            for (const interfaceName of typeInterfacesMap[typeName] ?? []) {
              mergedTypeConfig = subschema?.merge?.[interfaceName];
              if (mergedTypeConfig) {
                break;
              }
            }
          }

          if (mergedTypeConfig == null) {
            continue;
          }

          if (mergedTypeConfig.selectionSet) {
            const selectionSet = parseSelectionSet(mergedTypeConfig.selectionSet, {
              noLocation: true,
            });
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

          // We already know that the type is an object or interface type
          const type = subschema.transformedSchema.getType(typeName) as
            | GraphQLObjectType
            | GraphQLInterfaceType;

          const resolver =
            mergedTypeConfig.resolve ?? createMergedTypeResolver(mergedTypeConfig, type);

          if (resolver == null) {
            continue;
          }

          const keyFn = mergedTypeConfig.key;
          resolvers.set(
            subschema,
            keyFn
              ? function batchMergedTypeResolverWrapper(
                  originalResult,
                  context,
                  info,
                  subschema,
                  selectionSet,
                  type,
                ) {
                  return new ValueOrPromise(() => keyFn(originalResult))
                    .then(key =>
                      resolver(originalResult, context, info, subschema, selectionSet, key, type),
                    )
                    .resolve();
                }
              : resolver,
          );

          targetSubschemas.push(subschema);

          const fieldMap = type.getFields();
          const selectionSet = selectionSets.get(subschema);
          for (const fieldName in fieldMap) {
            const field = fieldMap[fieldName];
            const fieldType = getNamedType(field.type);
            if (
              selectionSet &&
              isLeafType(fieldType) &&
              selectionSetContainsTopLevelField(selectionSet, fieldName)
            ) {
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
        } as MergedTypeInfo<TContext>;

        mergedTypes[typeName].delegationPlanBuilder = createDelegationPlanBuilder(
          mergedTypes[typeName] as MergedTypeInfo,
        );

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
  schema: GraphQLSchema,
): StitchingInfo<TContext> {
  const { fieldNodesByType, fieldNodesByField, dynamicSelectionSetsByField, mergedTypes } =
    stitchingInfo;

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

  const selectionSetsByField: Record<
    string,
    Record<string, Array<SelectionSetNode>>
  > = Object.create(null);
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
        if (
          selectionSet &&
          isLeafType(fieldType) &&
          selectionSetContainsTopLevelField(selectionSet, fieldName)
        ) {
          continue;
        }
        updateSelectionSetMap(selectionSetsByField, typeName, fieldName, selectionSet, true);
      }
      if (isAbstractType(type)) {
        updateSelectionSetMap(selectionSetsByField, typeName, '__typename', selectionSet);
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

  const variableValues = Object.create(null);
  const fragments = Object.create(null);

  const fieldNodeMap: Record<string, FieldNode> = Object.create(null);

  for (const typeName in selectionSetsByField) {
    const type = schema.getType(typeName) as GraphQLObjectType;
    for (const fieldName in selectionSetsByField[typeName]) {
      for (const selectionSet of selectionSetsByField[typeName][fieldName]) {
        const { fields } = collectFields(schema, fragments, variableValues, type, selectionSet);

        for (const [, fieldNodes] of fields) {
          for (const fieldNode of fieldNodes) {
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
  includeTypename?: boolean,
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
  initialValue?: T,
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
  stitchingInfo: StitchingInfo<TContext>,
) {
  stitchedSchema.extensions = {
    ...stitchedSchema.extensions,
    stitchingInfo,
  };
}

export function selectionSetContainsTopLevelField(
  selectionSet: SelectionSetNode,
  fieldName: string,
) {
  return selectionSet.selections.some(
    selection => selection.kind === Kind.FIELD && selection.name.value === fieldName,
  );
}
