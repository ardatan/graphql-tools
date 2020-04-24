import {
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLSchema,
  Kind,
  SelectionNode,
  SelectionSetNode,
  isObjectType,
  isScalarType,
} from 'graphql';

import {
  IDelegateToSchemaOptions,
  MergeInfo,
  IResolversParameter,
  isSubschemaConfig,
  SubschemaConfig,
  MergedTypeInfo,
  Transform,
  TypeMap,
  MergeTypeFilter,
} from '../Interfaces';
import ExpandAbstractTypes from '../delegate/transforms/ExpandAbstractTypes';
import AddReplacementFragments from '../delegate/transforms/AddReplacementFragments';
import {
  parseFragmentToInlineFragment,
  concatInlineFragments,
} from '../utils/fragments';
import {
  typeContainsSelectionSet,
  parseSelectionSet,
} from '../utils/selectionSets';

import delegateToSchema from '../delegate/delegateToSchema';

type MergeTypeCandidate = {
  type: GraphQLNamedType;
  schema?: GraphQLSchema;
  subschema?: GraphQLSchema | SubschemaConfig;
  transformedSubschema?: GraphQLSchema;
};

export function createMergeInfo(
  allSchemas: Array<GraphQLSchema>,
  typeCandidates: Record<string, Array<MergeTypeCandidate>>,
  mergeTypes?: boolean | Array<string> | MergeTypeFilter,
): MergeInfo {
  return {
    delegate(
      operation: 'query' | 'mutation' | 'subscription',
      fieldName: string,
      args: Record<string, any>,
      context: Record<string, any>,
      info: GraphQLResolveInfo,
      transforms: Array<Transform> = [],
    ) {
      const schema = guessSchemaByRootField(allSchemas, operation, fieldName);
      const expandTransforms = new ExpandAbstractTypes(info.schema, schema);
      const fragmentTransform = new AddReplacementFragments(
        schema,
        info.mergeInfo.replacementFragments,
      );
      return delegateToSchema({
        schema,
        operation,
        fieldName,
        args,
        context,
        info,
        transforms: [...transforms, expandTransforms, fragmentTransform],
      });
    },

    delegateToSchema(options: IDelegateToSchemaOptions) {
      return delegateToSchema({
        ...options,
        transforms: options.transforms,
      });
    },
    fragments: [],
    replacementSelectionSets: undefined,
    replacementFragments: undefined,
    mergedTypes: createMergedTypes(typeCandidates, mergeTypes),
  };
}

function createMergedTypes(
  typeCandidates: Record<string, Array<MergeTypeCandidate>>,
  mergeTypes?: boolean | Array<string> | MergeTypeFilter,
): Record<string, MergedTypeInfo> {
  const mergedTypes: Record<string, MergedTypeInfo> = Object.create(null);

  Object.keys(typeCandidates).forEach((typeName) => {
    if (isObjectType(typeCandidates[typeName][0].type)) {
      const mergedTypeCandidates = typeCandidates[typeName].filter(
        (typeCandidate) =>
          typeCandidate.subschema != null &&
          isSubschemaConfig(typeCandidate.subschema) &&
          typeCandidate.subschema.merge != null &&
          typeName in typeCandidate.subschema.merge,
      );

      if (
        mergeTypes === true ||
        (typeof mergeTypes === 'function' &&
          mergeTypes(typeCandidates[typeName], typeName)) ||
        (Array.isArray(mergeTypes) && mergeTypes.includes(typeName)) ||
        mergedTypeCandidates.length
      ) {
        const subschemas: Array<SubschemaConfig> = [];

        let requiredSelections: Array<SelectionNode> = [
          parseSelectionSet('{ __typename }').selections[0],
        ];
        const fields = Object.create({});
        const typeMaps: Map<SubschemaConfig, TypeMap> = new Map();
        const selectionSets: Map<SubschemaConfig, SelectionSetNode> = new Map();

        mergedTypeCandidates.forEach((typeCandidate) => {
          const subschemaConfig = typeCandidate.subschema as SubschemaConfig;
          const transformedSubschema = typeCandidate.transformedSubschema;
          typeMaps.set(subschemaConfig, transformedSubschema.getTypeMap());
          const type = transformedSubschema.getType(
            typeName,
          ) as GraphQLObjectType;
          const fieldMap = type.getFields();
          Object.keys(fieldMap).forEach((fieldName) => {
            if (!(fieldName in fields)) {
              fields[fieldName] = [];
            }
            fields[fieldName].push(subschemaConfig);
          });

          const mergedTypeConfig = subschemaConfig.merge[typeName];

          if (mergedTypeConfig.selectionSet) {
            const selectionSet = parseSelectionSet(
              mergedTypeConfig.selectionSet,
            );
            requiredSelections = requiredSelections.concat(
              selectionSet.selections,
            );
            selectionSets.set(subschemaConfig, selectionSet);
          }

          if (!mergedTypeConfig.resolve) {
            mergedTypeConfig.resolve = (
              originalResult,
              context,
              info,
              subschema,
              selectionSet,
            ) =>
              delegateToSchema({
                schema: subschema,
                operation: 'query',
                fieldName: mergedTypeConfig.fieldName,
                args: mergedTypeConfig.args(originalResult),
                selectionSet,
                context,
                info,
                skipTypeMerging: true,
              });
          }

          subschemas.push(subschemaConfig);
        });

        mergedTypes[typeName] = {
          subschemas,
          typeMaps,
          selectionSets,
          containsSelectionSet: new Map(),
          uniqueFields: Object.create({}),
          nonUniqueFields: Object.create({}),
        };

        subschemas.forEach((subschema) => {
          const type = typeMaps.get(subschema)[typeName] as GraphQLObjectType;
          const subschemaMap = new Map();
          subschemas
            .filter((s) => s !== subschema)
            .forEach((s) => {
              const selectionSet = selectionSets.get(s);
              if (
                selectionSet != null &&
                typeContainsSelectionSet(type, selectionSet)
              ) {
                subschemaMap.set(selectionSet, true);
              }
            });
          mergedTypes[typeName].containsSelectionSet.set(
            subschema,
            subschemaMap,
          );
        });

        Object.keys(fields).forEach((fieldName) => {
          const supportedBySubschemas = fields[fieldName];
          if (supportedBySubschemas.length === 1) {
            mergedTypes[typeName].uniqueFields[fieldName] =
              supportedBySubschemas[0];
          } else {
            mergedTypes[typeName].nonUniqueFields[
              fieldName
            ] = supportedBySubschemas;
          }
        });

        mergedTypes[typeName].selectionSet = {
          kind: Kind.SELECTION_SET,
          selections: requiredSelections,
        };
      }
    }
  });

  return mergedTypes;
}

export function completeMergeInfo(
  mergeInfo: MergeInfo,
  resolvers: IResolversParameter,
): MergeInfo {
  const replacementSelectionSets = Object.create(null);

  Object.keys(resolvers).forEach((typeName) => {
    const type = resolvers[typeName];
    if (isScalarType(type)) {
      return;
    }
    Object.keys(type).forEach((fieldName) => {
      const field = type[fieldName];
      if (field.selectionSet) {
        const selectionSet = parseSelectionSet(field.selectionSet);
        if (!(typeName in replacementSelectionSets)) {
          replacementSelectionSets[typeName] = Object.create(null);
        }

        const typeReplacementSelectionSets = replacementSelectionSets[typeName];
        if (!(fieldName in typeReplacementSelectionSets)) {
          typeReplacementSelectionSets[fieldName] = {
            kind: Kind.SELECTION_SET,
            selections: [],
          };
        }
        typeReplacementSelectionSets[
          fieldName
        ].selections = typeReplacementSelectionSets[
          fieldName
        ].selections.concat(selectionSet.selections);
      }
      if (field.fragment) {
        mergeInfo.fragments.push({
          field: fieldName,
          fragment: field.fragment,
        });
      }
    });
  });

  const mapping = Object.create(null);
  mergeInfo.fragments.forEach(({ field, fragment }) => {
    const parsedFragment = parseFragmentToInlineFragment(fragment);
    const actualTypeName = parsedFragment.typeCondition.name.value;
    if (!(actualTypeName in mapping)) {
      mapping[actualTypeName] = Object.create(null);
    }

    const typeMapping = mapping[actualTypeName];
    if (!(field in typeMapping)) {
      typeMapping[field] = [];
    }
    typeMapping[field].push(parsedFragment);
  });

  const replacementFragments = Object.create(null);
  Object.keys(mapping).forEach((typeName) => {
    Object.keys(mapping[typeName]).forEach((field) => {
      if (!(typeName in replacementFragments)) {
        replacementFragments[typeName] = Object.create(null);
      }

      const typeReplacementFragments = replacementFragments[typeName];
      typeReplacementFragments[field] = concatInlineFragments(
        typeName,
        mapping[typeName][field],
      );
    });
  });

  mergeInfo.replacementSelectionSets = replacementSelectionSets;
  mergeInfo.replacementFragments = replacementFragments;

  return mergeInfo;
}

function operationToRootType(
  operation: 'query' | 'mutation' | 'subscription',
  schema: GraphQLSchema,
): GraphQLObjectType {
  if (operation === 'subscription') {
    return schema.getSubscriptionType();
  } else if (operation === 'mutation') {
    return schema.getMutationType();
  }

  return schema.getQueryType();
}

function guessSchemaByRootField(
  schemas: Array<GraphQLSchema>,
  operation: 'query' | 'mutation' | 'subscription',
  fieldName: string,
): GraphQLSchema {
  for (const schema of schemas) {
    const rootObject = operationToRootType(operation, schema);
    if (rootObject != null) {
      const fields = rootObject.getFields();
      if (fieldName in fields) {
        return schema;
      }
    }
  }
  throw new Error(
    `Could not find subschema with field \`${operation}.${fieldName}\``,
  );
}
