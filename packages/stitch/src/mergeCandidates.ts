import {
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLEnumType,
  isScalarType,
  isObjectType,
  isInterfaceType,
  isUnionType,
  isEnumType,
  isInputObjectType,
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLInputObjectType,
  GraphQLInputFieldConfig,
  GraphQLInputFieldConfigMap,
  ObjectTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  UnionTypeDefinitionNode,
  EnumTypeDefinitionNode,
  GraphQLEnumValueConfigMap,
  ScalarTypeDefinitionNode,
  GraphQLScalarType,
  GraphQLScalarSerializer,
  GraphQLScalarValueParser,
  GraphQLScalarLiteralParser,
} from 'graphql';

import { mergeType, mergeInputType, mergeInterface, mergeUnion, mergeEnum, mergeScalar } from '@graphql-tools/merge';

import {
  MergeTypeCandidate,
  TypeMergingOptions,
  MergeFieldConfigCandidate,
  MergeInputFieldConfigCandidate,
  MergeEnumValueConfigCandidate,
} from './types';

import {
  validateFieldConsistency,
  validateInputFieldConsistency,
  validateInputObjectConsistency,
} from './mergeValidations';

import { fieldToFieldConfig, inputFieldToFieldConfig } from '@graphql-tools/utils';
import { isSubschemaConfig } from '@graphql-tools/delegate';

export function mergeCandidates(
  typeName: string,
  candidates: Array<MergeTypeCandidate>,
  typeMergingOptions: TypeMergingOptions
): GraphQLNamedType {
  const initialCandidateType = candidates[0].type;
  if (candidates.some(candidate => candidate.type.constructor !== initialCandidateType.constructor)) {
    throw new Error(`Cannot merge different type categories into common type ${typeName}.`);
  }
  if (isObjectType(initialCandidateType)) {
    return mergeObjectTypeCandidates(typeName, candidates, typeMergingOptions);
  } else if (isInputObjectType(initialCandidateType)) {
    return mergeInputObjectTypeCandidates(typeName, candidates, typeMergingOptions);
  } else if (isInterfaceType(initialCandidateType)) {
    return mergeInterfaceTypeCandidates(typeName, candidates, typeMergingOptions);
  } else if (isUnionType(initialCandidateType)) {
    return mergeUnionTypeCandidates(typeName, candidates, typeMergingOptions);
  } else if (isEnumType(initialCandidateType)) {
    return mergeEnumTypeCandidates(typeName, candidates, typeMergingOptions);
  } else if (isScalarType(initialCandidateType)) {
    return mergeScalarTypeCandidates(typeName, candidates, typeMergingOptions);
  } else {
    // not reachable.
    throw new Error(`Type ${typeName} has unknown GraphQL type.`);
  }
}

function mergeObjectTypeCandidates(
  typeName: string,
  candidates: Array<MergeTypeCandidate>,
  typeMergingOptions: TypeMergingOptions
): GraphQLObjectType<any, any> {
  candidates = orderedTypeCandidates(candidates, typeMergingOptions);

  const description = mergeTypeDescriptions(candidates, typeMergingOptions);
  const fields = fieldConfigMapFromTypeCandidates(candidates, typeMergingOptions);
  const typeConfigs = candidates.map(candidate => (candidate.type as GraphQLObjectType).toConfig());
  const interfaceMap = typeConfigs
    .map(typeConfig => typeConfig.interfaces)
    .reduce((acc, interfaces) => {
      if (interfaces != null) {
        interfaces.forEach(iface => {
          acc[iface.name] = iface;
        });
      }
      return acc;
    }, Object.create(null));
  const interfaces = Object.keys(interfaceMap).map(interfaceName => interfaceMap[interfaceName]);

  const astNodes = pluck<ObjectTypeDefinitionNode>('astNode', candidates);
  const fieldAstNodes = canonicalFieldNamesForType(candidates)
    .map(fieldName => fields[fieldName]?.astNode)
    .filter(n => n != null);

  if (astNodes.length > 1 && fieldAstNodes.length) {
    astNodes.push({
      ...astNodes[astNodes.length - 1],
      fields: JSON.parse(JSON.stringify(fieldAstNodes)),
    });
  }

  const astNode = astNodes
    .slice(1)
    .reduce(
      (acc, astNode) =>
        mergeType(astNode, acc as ObjectTypeDefinitionNode, { ignoreFieldConflicts: true }) as ObjectTypeDefinitionNode,
      astNodes[0]
    );

  const extensionASTNodes = [].concat(pluck<Record<string, any>>('extensionASTNodes', candidates));

  const extensions = Object.assign({}, ...pluck<Record<string, any>>('extensions', candidates));

  const typeConfig = {
    name: typeName,
    description,
    fields,
    interfaces,
    astNode,
    extensionASTNodes,
    extensions,
  };

  return new GraphQLObjectType(typeConfig);
}

function mergeInputObjectTypeCandidates(
  typeName: string,
  candidates: Array<MergeTypeCandidate>,
  typeMergingOptions: TypeMergingOptions
): GraphQLInputObjectType {
  candidates = orderedTypeCandidates(candidates, typeMergingOptions);

  const description = mergeTypeDescriptions(candidates, typeMergingOptions);
  const fields = inputFieldConfigMapFromTypeCandidates(candidates, typeMergingOptions);

  const astNodes = pluck<InputObjectTypeDefinitionNode>('astNode', candidates);
  const fieldAstNodes = canonicalFieldNamesForType(candidates)
    .map(fieldName => fields[fieldName]?.astNode)
    .filter(n => n != null);

  if (astNodes.length > 1 && fieldAstNodes.length) {
    astNodes.push({
      ...astNodes[astNodes.length - 1],
      fields: JSON.parse(JSON.stringify(fieldAstNodes)),
    });
  }

  const astNode = astNodes.slice(1).reduce(
    (acc, astNode) =>
      mergeInputType(astNode, acc as InputObjectTypeDefinitionNode, {
        ignoreFieldConflicts: true,
      }) as InputObjectTypeDefinitionNode,
    astNodes[0]
  );

  const extensionASTNodes = [].concat(pluck<Record<string, any>>('extensionASTNodes', candidates));

  const extensions = Object.assign({}, ...pluck<Record<string, any>>('extensions', candidates));

  const typeConfig = {
    name: typeName,
    description,
    fields,
    astNode,
    extensionASTNodes,
    extensions,
  };

  return new GraphQLInputObjectType(typeConfig);
}

function pluck<T>(typeProperty: string, candidates: Array<MergeTypeCandidate>): Array<T> {
  return candidates.map(candidate => candidate.type[typeProperty]).filter(value => value != null) as Array<T>;
}

function mergeInterfaceTypeCandidates(
  typeName: string,
  candidates: Array<MergeTypeCandidate>,
  typeMergingOptions: TypeMergingOptions
): GraphQLInterfaceType {
  candidates = orderedTypeCandidates(candidates, typeMergingOptions);

  const description = mergeTypeDescriptions(candidates, typeMergingOptions);
  const fields = fieldConfigMapFromTypeCandidates(candidates, typeMergingOptions);
  const typeConfigs = candidates.map(candidate => (candidate.type as GraphQLInterfaceType).toConfig());
  const interfaceMap = typeConfigs
    .map(typeConfig => ((typeConfig as unknown) as { interfaces: Array<GraphQLInterfaceType> }).interfaces)
    .reduce((acc, interfaces) => {
      if (interfaces != null) {
        interfaces.forEach(iface => {
          acc[iface.name] = iface;
        });
      }
      return acc;
    }, Object.create(null));
  const interfaces = Object.keys(interfaceMap).map(interfaceName => interfaceMap[interfaceName]);

  const astNodes = pluck<InterfaceTypeDefinitionNode>('astNode', candidates);
  const fieldAstNodes = canonicalFieldNamesForType(candidates)
    .map(fieldName => fields[fieldName]?.astNode)
    .filter(n => n != null);

  if (astNodes.length > 1 && fieldAstNodes.length) {
    astNodes.push({
      ...astNodes[astNodes.length - 1],
      fields: JSON.parse(JSON.stringify(fieldAstNodes)),
    });
  }

  const astNode = astNodes.slice(1).reduce(
    (acc, astNode) =>
      mergeInterface(astNode, acc as InterfaceTypeDefinitionNode, {
        ignoreFieldConflicts: true,
      }) as InterfaceTypeDefinitionNode,
    astNodes[0]
  );

  const extensionASTNodes = [].concat(pluck<Record<string, any>>('extensionASTNodes', candidates));

  const extensions = Object.assign({}, ...pluck<Record<string, any>>('extensions', candidates));

  const typeConfig = {
    name: typeName,
    description,
    fields,
    interfaces,
    astNode,
    extensionASTNodes,
    extensions,
  };

  return new GraphQLInterfaceType(typeConfig);
}

function mergeUnionTypeCandidates(
  typeName: string,
  candidates: Array<MergeTypeCandidate>,
  typeMergingOptions: TypeMergingOptions
): GraphQLUnionType {
  candidates = orderedTypeCandidates(candidates, typeMergingOptions);
  const description = mergeTypeDescriptions(candidates, typeMergingOptions);

  const typeConfigs = candidates.map(candidate => (candidate.type as GraphQLUnionType).toConfig());
  const typeMap = typeConfigs.reduce((acc, typeConfig) => {
    typeConfig.types.forEach(type => {
      acc[type.name] = type;
    });
    return acc;
  }, Object.create(null));
  const types = Object.keys(typeMap).map(typeName => typeMap[typeName]);

  const astNodes = pluck<UnionTypeDefinitionNode>('astNode', candidates);
  const astNode = astNodes
    .slice(1)
    .reduce(
      (acc, astNode) => mergeUnion(astNode, acc as UnionTypeDefinitionNode) as UnionTypeDefinitionNode,
      astNodes[0]
    );

  const extensionASTNodes = [].concat(pluck<Record<string, any>>('extensionASTNodes', candidates));

  const extensions = Object.assign({}, ...pluck<Record<string, any>>('extensions', candidates));

  const typeConfig = {
    name: typeName,
    description,
    types,
    astNode,
    extensionASTNodes,
    extensions,
  };

  return new GraphQLUnionType(typeConfig);
}

function mergeEnumTypeCandidates(
  typeName: string,
  candidates: Array<MergeTypeCandidate>,
  typeMergingOptions: TypeMergingOptions
): GraphQLEnumType {
  candidates = orderedTypeCandidates(candidates, typeMergingOptions);

  const description = mergeTypeDescriptions(candidates, typeMergingOptions);
  const values = enumValueConfigMapFromTypeCandidates(candidates, typeMergingOptions);

  const astNodes = pluck<EnumTypeDefinitionNode>('astNode', candidates);
  const astNode = astNodes
    .slice(1)
    .reduce(
      (acc, astNode) =>
        mergeEnum(astNode, acc as EnumTypeDefinitionNode, { consistentEnumMerge: true }) as EnumTypeDefinitionNode,
      astNodes[0]
    );

  const extensionASTNodes = [].concat(pluck<Record<string, any>>('extensionASTNodes', candidates));

  const extensions = Object.assign({}, ...pluck<Record<string, any>>('extensions', candidates));

  const typeConfig = {
    name: typeName,
    description,
    values,
    astNode,
    extensionASTNodes,
    extensions,
  };

  return new GraphQLEnumType(typeConfig);
}

function enumValueConfigMapFromTypeCandidates(
  candidates: Array<MergeTypeCandidate>,
  typeMergingOptions: TypeMergingOptions
): GraphQLEnumValueConfigMap {
  const enumValueConfigCandidatesMap: Record<string, Array<MergeEnumValueConfigCandidate>> = Object.create(null);

  candidates.forEach(candidate => {
    const valueMap = (candidate.type as GraphQLEnumType).toConfig().values;
    Object.keys(valueMap).forEach(enumValue => {
      const enumValueConfigCandidate = {
        enumValueConfig: valueMap[enumValue],
        enumValue,
        type: candidate.type as GraphQLEnumType,
        subschema: candidate.subschema,
        transformedSubschema: candidate.transformedSubschema,
      };

      if (enumValue in enumValueConfigCandidatesMap) {
        enumValueConfigCandidatesMap[enumValue].push(enumValueConfigCandidate);
      } else {
        enumValueConfigCandidatesMap[enumValue] = [enumValueConfigCandidate];
      }
    });
  });

  const enumValueConfigMap = Object.create(null);

  Object.keys(enumValueConfigCandidatesMap).forEach(enumValue => {
    const enumValueConfigMerger = typeMergingOptions?.enumValueConfigMerger ?? defaultEnumValueConfigMerger;
    enumValueConfigMap[enumValue] = enumValueConfigMerger(enumValueConfigCandidatesMap[enumValue]);
  });

  return enumValueConfigMap;
}

function defaultEnumValueConfigMerger(candidates: Array<MergeEnumValueConfigCandidate>) {
  const preferred = candidates.find(
    ({ type, transformedSubschema }) =>
      isSubschemaConfig(transformedSubschema) && transformedSubschema.merge?.[type.name]?.canonical
  );
  return (preferred || candidates[candidates.length - 1]).enumValueConfig;
}

function mergeScalarTypeCandidates(
  typeName: string,
  candidates: Array<MergeTypeCandidate>,
  typeMergingOptions: TypeMergingOptions
): GraphQLScalarType {
  candidates = orderedTypeCandidates(candidates, typeMergingOptions);

  const description = mergeTypeDescriptions(candidates, typeMergingOptions);
  const serializeFns = pluck<GraphQLScalarSerializer<any>>('serialize', candidates);
  const serialize = serializeFns[serializeFns.length - 1];

  const parseValueFns = pluck<GraphQLScalarValueParser<any>>('parseValue', candidates);
  const parseValue = parseValueFns[parseValueFns.length - 1];

  const parseLiteralFns = pluck<GraphQLScalarLiteralParser<any>>('parseLiteral', candidates);
  const parseLiteral = parseLiteralFns[parseLiteralFns.length - 1];

  const astNodes = pluck<ScalarTypeDefinitionNode>('astNode', candidates);
  const astNode = astNodes
    .slice(1)
    .reduce(
      (acc, astNode) => mergeScalar(astNode, acc as ScalarTypeDefinitionNode) as ScalarTypeDefinitionNode,
      astNodes[0]
    );

  const extensionASTNodes = [].concat(pluck<Record<string, any>>('extensionASTNodes', candidates));

  const extensions = Object.assign({}, ...pluck<Record<string, any>>('extensions', candidates));

  const typeConfig = {
    name: typeName,
    description,
    serialize,
    parseValue,
    parseLiteral,
    astNode,
    extensionASTNodes,
    extensions,
  };

  return new GraphQLScalarType(typeConfig);
}

function orderedTypeCandidates(
  candidates: Array<MergeTypeCandidate>,
  typeMergingOptions: TypeMergingOptions
): Array<MergeTypeCandidate> {
  const typeCandidateMerger = typeMergingOptions?.typeCandidateMerger ?? defaultTypeCandidateMerger;
  const candidate = typeCandidateMerger(candidates);
  return candidates.filter(c => c !== candidate).concat([candidate]);
}

function defaultTypeCandidateMerger(candidates: Array<MergeTypeCandidate>): MergeTypeCandidate {
  const canonical: Array<MergeTypeCandidate> = candidates.filter(({ type, transformedSubschema }) =>
    isSubschemaConfig(transformedSubschema) ? transformedSubschema.merge?.[type.name]?.canonical : false
  );

  if (canonical.length > 1) {
    throw new Error(`Multiple canonical definitions for "${canonical[0].type.name}"`);
  } else if (canonical.length) {
    return canonical[0];
  }

  return candidates[candidates.length - 1];
}

function mergeTypeDescriptions(candidates: Array<MergeTypeCandidate>, typeMergingOptions: TypeMergingOptions): string {
  const typeDescriptionsMerger = typeMergingOptions?.typeDescriptionsMerger ?? defaultTypeDescriptionMerger;
  return typeDescriptionsMerger(candidates);
}

function defaultTypeDescriptionMerger(candidates: Array<MergeTypeCandidate>): string {
  return candidates[candidates.length - 1].type.description;
}

function fieldConfigMapFromTypeCandidates(
  candidates: Array<MergeTypeCandidate>,
  typeMergingOptions: TypeMergingOptions
): GraphQLFieldConfigMap<any, any> {
  const fieldConfigCandidatesMap: Record<string, Array<MergeFieldConfigCandidate>> = Object.create(null);

  candidates.forEach(candidate => {
    const fieldMap = (candidate.type as GraphQLObjectType | GraphQLInterfaceType).getFields();
    Object.keys(fieldMap).forEach(fieldName => {
      const fieldConfigCandidate = {
        fieldConfig: fieldToFieldConfig(fieldMap[fieldName]),
        fieldName,
        type: candidate.type as GraphQLObjectType | GraphQLInterfaceType,
        subschema: candidate.subschema,
        transformedSubschema: candidate.transformedSubschema,
      };

      if (fieldName in fieldConfigCandidatesMap) {
        fieldConfigCandidatesMap[fieldName].push(fieldConfigCandidate);
      } else {
        fieldConfigCandidatesMap[fieldName] = [fieldConfigCandidate];
      }
    });
  });

  const fieldConfigMap = Object.create(null);

  Object.keys(fieldConfigCandidatesMap).forEach(fieldName => {
    fieldConfigMap[fieldName] = mergeFieldConfigs(fieldConfigCandidatesMap[fieldName], typeMergingOptions);
  });

  return fieldConfigMap;
}

function mergeFieldConfigs(candidates: Array<MergeFieldConfigCandidate>, typeMergingOptions: TypeMergingOptions) {
  const fieldConfigMerger = typeMergingOptions?.fieldConfigMerger ?? defaultFieldConfigMerger;
  const finalFieldConfig = fieldConfigMerger(candidates);
  validateFieldConsistency(finalFieldConfig, candidates, typeMergingOptions);
  return finalFieldConfig;
}

function defaultFieldConfigMerger(candidates: Array<MergeFieldConfigCandidate>) {
  const canonicalByField: Array<GraphQLFieldConfig<any, any>> = [];
  const canonicalByType: Array<GraphQLFieldConfig<any, any>> = [];

  candidates.forEach(({ type, fieldName, fieldConfig, transformedSubschema }) => {
    if (!isSubschemaConfig(transformedSubschema)) return;
    if (transformedSubschema.merge?.[type.name]?.fields?.[fieldName]?.canonical) {
      canonicalByField.push(fieldConfig);
    } else if (transformedSubschema.merge?.[type.name]?.canonical) {
      canonicalByType.push(fieldConfig);
    }
  });

  if (canonicalByField.length > 1) {
    throw new Error(`Multiple canonical definitions for "${candidates[0].type.name}.${candidates[0].fieldName}"`);
  } else if (canonicalByField.length) {
    return canonicalByField[0];
  } else if (canonicalByType.length) {
    return canonicalByType[0];
  }

  return candidates[candidates.length - 1].fieldConfig;
}

function inputFieldConfigMapFromTypeCandidates(
  candidates: Array<MergeTypeCandidate>,
  typeMergingOptions: TypeMergingOptions
): GraphQLInputFieldConfigMap {
  const inputFieldConfigCandidatesMap: Record<string, Array<MergeInputFieldConfigCandidate>> = Object.create(null);
  const fieldInclusionMap: Record<string, number> = Object.create(null);

  candidates.forEach(candidate => {
    const inputFieldMap = (candidate.type as GraphQLInputObjectType).getFields();
    Object.keys(inputFieldMap).forEach(fieldName => {
      fieldInclusionMap[fieldName] = fieldInclusionMap[fieldName] || 0;
      fieldInclusionMap[fieldName] += 1;

      const inputFieldConfigCandidate = {
        inputFieldConfig: inputFieldToFieldConfig(inputFieldMap[fieldName]),
        fieldName,
        type: candidate.type as GraphQLInputObjectType,
        subschema: candidate.subschema,
        transformedSubschema: candidate.transformedSubschema,
      };

      if (fieldName in inputFieldConfigCandidatesMap) {
        inputFieldConfigCandidatesMap[fieldName].push(inputFieldConfigCandidate);
      } else {
        inputFieldConfigCandidatesMap[fieldName] = [inputFieldConfigCandidate];
      }
    });
  });

  validateInputObjectConsistency(fieldInclusionMap, candidates, typeMergingOptions);

  const inputFieldConfigMap = Object.create(null);

  Object.keys(inputFieldConfigCandidatesMap).forEach(fieldName => {
    const inputFieldConfigMerger = typeMergingOptions?.inputFieldConfigMerger ?? defaultInputFieldConfigMerger;
    inputFieldConfigMap[fieldName] = inputFieldConfigMerger(inputFieldConfigCandidatesMap[fieldName]);
    validateInputFieldConsistency(
      inputFieldConfigMap[fieldName],
      inputFieldConfigCandidatesMap[fieldName],
      typeMergingOptions
    );
  });

  return inputFieldConfigMap;
}

function defaultInputFieldConfigMerger(candidates: Array<MergeInputFieldConfigCandidate>) {
  const canonicalByField: Array<GraphQLInputFieldConfig> = [];
  const canonicalByType: Array<GraphQLInputFieldConfig> = [];

  candidates.forEach(({ type, fieldName, inputFieldConfig, transformedSubschema }) => {
    if (!isSubschemaConfig(transformedSubschema)) return;
    if (transformedSubschema.merge?.[type.name]?.fields?.[fieldName]?.canonical) {
      canonicalByField.push(inputFieldConfig);
    } else if (transformedSubschema.merge?.[type.name]?.canonical) {
      canonicalByType.push(inputFieldConfig);
    }
  });

  if (canonicalByField.length > 1) {
    throw new Error(`Multiple canonical definitions for "${candidates[0].type.name}.${candidates[0].fieldName}"`);
  } else if (canonicalByField.length) {
    return canonicalByField[0];
  } else if (canonicalByType.length) {
    return canonicalByType[0];
  }

  return candidates[candidates.length - 1].inputFieldConfig;
}

function canonicalFieldNamesForType(candidates: Array<MergeTypeCandidate>): Array<string> {
  const canonicalFieldNames: Record<string, boolean> = Object.create(null);

  candidates.forEach(({ type, transformedSubschema }) => {
    if (
      isSubschemaConfig(transformedSubschema) &&
      transformedSubschema.merge?.[type.name]?.fields &&
      !transformedSubschema.merge[type.name].canonical
    ) {
      Object.entries(transformedSubschema.merge[type.name].fields).forEach(([fieldName, mergedFieldConfig]) => {
        if (mergedFieldConfig.canonical) {
          canonicalFieldNames[fieldName] = true;
        }
      });
    }
  });

  return Object.keys(canonicalFieldNames);
}
