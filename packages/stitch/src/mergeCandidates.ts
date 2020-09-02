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
  GraphQLFieldConfigMap,
  GraphQLInputObjectType,
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

import { mergeType, mergeInputType, mergeInterface, mergeUnion, mergeEnum } from '@graphql-tools/merge';

import {
  MergeTypeCandidate,
  TypeMergingOptions,
  MergeFieldConfigCandidate,
  MergeInputFieldConfigCandidate,
} from './types';
import { fieldToFieldConfig, inputFieldToFieldConfig } from '@graphql-tools/utils';

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
  const astNode = astNodes
    .slice(1)
    .reduce(
      (acc, astNode) => mergeType(astNode, acc as ObjectTypeDefinitionNode) as ObjectTypeDefinitionNode,
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
  const description = mergeTypeDescriptions(candidates, typeMergingOptions);
  const fields = inputFieldConfigMapFromTypeCandidates(candidates, typeMergingOptions);

  const astNodes = pluck<InputObjectTypeDefinitionNode>('astNode', candidates);
  const astNode = astNodes
    .slice(1)
    .reduce(
      (acc, astNode) => mergeInputType(astNode, acc as InputObjectTypeDefinitionNode) as InputObjectTypeDefinitionNode,
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
  const astNode = astNodes
    .slice(1)
    .reduce(
      (acc, astNode) => mergeInterface(astNode, acc as InterfaceTypeDefinitionNode, {}) as InterfaceTypeDefinitionNode,
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
  const description = mergeTypeDescriptions(candidates, typeMergingOptions);

  const typeConfigs = candidates.map(candidate => (candidate.type as GraphQLEnumType).toConfig());
  const values = typeConfigs.reduce<GraphQLEnumValueConfigMap>(
    (acc, typeConfig) => ({
      ...acc,
      ...typeConfig.values,
    }),
    {}
  );

  const astNodes = pluck<EnumTypeDefinitionNode>('astNode', candidates);
  const astNode = astNodes
    .slice(1)
    .reduce((acc, astNode) => mergeEnum(astNode, acc as EnumTypeDefinitionNode) as EnumTypeDefinitionNode, astNodes[0]);

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

function mergeScalarTypeCandidates(
  typeName: string,
  candidates: Array<MergeTypeCandidate>,
  typeMergingOptions: TypeMergingOptions
): GraphQLScalarType {
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
    .reduce((acc, astNode) => mergeScalarTypeDefinitionNodes(acc as ScalarTypeDefinitionNode, astNode), astNodes[0]);

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
        transformedSchema: candidate.transformedSchema,
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
  return fieldConfigMerger(candidates);
}

function defaultFieldConfigMerger(candidates: Array<MergeFieldConfigCandidate>) {
  return candidates[candidates.length - 1].fieldConfig;
}

function inputFieldConfigMapFromTypeCandidates(
  candidates: Array<MergeTypeCandidate>,
  typeMergingOptions: TypeMergingOptions
): GraphQLInputFieldConfigMap {
  const inputFieldConfigCandidatesMap: Record<string, Array<MergeInputFieldConfigCandidate>> = Object.create(null);

  candidates.forEach(candidate => {
    const inputFieldMap = (candidate.type as GraphQLInputObjectType).getFields();
    Object.keys(inputFieldMap).forEach(fieldName => {
      const inputFieldConfigCandidate = {
        inputFieldConfig: inputFieldToFieldConfig(inputFieldMap[fieldName]),
        fieldName,
        type: candidate.type as GraphQLInputObjectType,
        subschema: candidate.subschema,
        transformedSchema: candidate.transformedSchema,
      };

      if (fieldName in inputFieldConfigCandidatesMap) {
        inputFieldConfigCandidatesMap[fieldName].push(inputFieldConfigCandidate);
      } else {
        inputFieldConfigCandidatesMap[fieldName] = [inputFieldConfigCandidate];
      }
    });
  });

  const inputFieldConfigMap = Object.create(null);

  Object.keys(inputFieldConfigCandidatesMap).forEach(fieldName => {
    inputFieldConfigMap[fieldName] = mergeInputFieldConfigs(
      inputFieldConfigCandidatesMap[fieldName],
      typeMergingOptions
    );
  });

  return inputFieldConfigMap;
}

function mergeInputFieldConfigs(
  candidates: Array<MergeInputFieldConfigCandidate>,
  typeMergingOptions: TypeMergingOptions
) {
  const inputFieldConfigMerger = typeMergingOptions?.inputFieldConfigMerger ?? defaultInputFieldConfigMerger;
  return inputFieldConfigMerger(candidates);
}

function defaultInputFieldConfigMerger(candidates: Array<MergeInputFieldConfigCandidate>) {
  return candidates[candidates.length - 1].inputFieldConfig;
}

function mergeScalarTypeDefinitionNodes(
  targetNode: ScalarTypeDefinitionNode,
  sourceNode: ScalarTypeDefinitionNode
): ScalarTypeDefinitionNode {
  return {
    ...targetNode,
    description: sourceNode.description ?? targetNode.description,
    directives: (targetNode.directives ?? []).concat(sourceNode.directives ?? []),
  };
}
