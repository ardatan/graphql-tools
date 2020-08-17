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

import { MergeTypeCandidate } from './types';

export function mergeCandidates(typeName: string, candidates: Array<MergeTypeCandidate>): GraphQLNamedType {
  const initialCandidateType = candidates[0].type;
  if (candidates.some(candidate => candidate.type.constructor !== initialCandidateType.constructor)) {
    throw new Error(`Cannot merge different type categories into common type ${typeName}.`);
  }
  if (isObjectType(initialCandidateType)) {
    return mergeObjectTypeCandidates(typeName, candidates);
  } else if (isInputObjectType(initialCandidateType)) {
    return mergeInputObjectTypeCandidates(typeName, candidates);
  } else if (isInterfaceType(initialCandidateType)) {
    return mergeInterfaceTypeCandidates(typeName, candidates);
  } else if (isUnionType(initialCandidateType)) {
    return mergeUnionTypeCandidates(typeName, candidates);
  } else if (isEnumType(initialCandidateType)) {
    return mergeEnumTypeCandidates(typeName, candidates);
  } else if (isScalarType(initialCandidateType)) {
    return mergeScalarTypeCandidates(typeName, candidates);
  } else {
    // not reachable.
    throw new Error(`Type ${typeName} has unknown GraphQL type.`);
  }
}

function mergeObjectTypeCandidates(
  typeName: string,
  candidates: Array<MergeTypeCandidate>
): GraphQLObjectType<any, any> {
  const descriptions = pluck<string>('description', candidates);
  const description = descriptions[descriptions.length - 1];

  const configs = candidates.map(candidate => (candidate.type as GraphQLObjectType).toConfig());
  const fields = configs.reduce<GraphQLFieldConfigMap<any, any>>(
    (acc, config) => ({
      ...acc,
      ...config.fields,
    }),
    {}
  );

  const interfaceMap = configs
    .map(config => config.interfaces)
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

  const config = {
    name: typeName,
    description,
    fields,
    interfaces,
    astNode,
    extensionASTNodes,
    extensions,
  };

  return new GraphQLObjectType(config);
}

function mergeInputObjectTypeCandidates(
  typeName: string,
  candidates: Array<MergeTypeCandidate>
): GraphQLInputObjectType {
  const descriptions = pluck<string>('description', candidates);
  const description = descriptions[descriptions.length - 1];

  const configs = candidates.map(candidate => (candidate.type as GraphQLInputObjectType).toConfig());
  const fields = configs.reduce<GraphQLInputFieldConfigMap>(
    (acc, config) => ({
      ...acc,
      ...config.fields,
    }),
    {}
  );

  const astNodes = pluck<InputObjectTypeDefinitionNode>('astNode', candidates);
  const astNode = astNodes
    .slice(1)
    .reduce(
      (acc, astNode) => mergeInputType(astNode, acc as InputObjectTypeDefinitionNode) as InputObjectTypeDefinitionNode,
      astNodes[0]
    );

  const extensionASTNodes = [].concat(pluck<Record<string, any>>('extensionASTNodes', candidates));

  const extensions = Object.assign({}, ...pluck<Record<string, any>>('extensions', candidates));

  const config = {
    name: typeName,
    description,
    fields,
    astNode,
    extensionASTNodes,
    extensions,
  };

  return new GraphQLInputObjectType(config);
}

function pluck<T>(typeProperty: string, candidates: Array<MergeTypeCandidate>): Array<T> {
  return candidates.map(candidate => candidate.type[typeProperty]).filter(value => value != null) as Array<T>;
}

function mergeInterfaceTypeCandidates(typeName: string, candidates: Array<MergeTypeCandidate>): GraphQLInterfaceType {
  const descriptions = pluck<string>('description', candidates);
  const description = descriptions[descriptions.length - 1];

  const configs = candidates.map(candidate => (candidate.type as GraphQLInterfaceType).toConfig());
  const fields = configs.reduce<GraphQLFieldConfigMap<any, any>>(
    (acc, config) => ({
      ...acc,
      ...config.fields,
    }),
    {}
  );

  const interfaceMap = configs
    .map(config => ((config as unknown) as { interfaces: Array<GraphQLInterfaceType> }).interfaces)
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

  const config = {
    name: typeName,
    description,
    fields,
    interfaces,
    astNode,
    extensionASTNodes,
    extensions,
  };

  return new GraphQLInterfaceType(config);
}

function mergeUnionTypeCandidates(typeName: string, candidates: Array<MergeTypeCandidate>): GraphQLUnionType {
  const descriptions = pluck<string>('description', candidates);
  const description = descriptions[descriptions.length - 1];

  const configs = candidates.map(candidate => (candidate.type as GraphQLUnionType).toConfig());
  const typeMap = configs.reduce((acc, config) => {
    config.types.forEach(type => {
      typeMap[type.name] = type;
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

  const config = {
    name: typeName,
    description,
    types,
    astNode,
    extensionASTNodes,
    extensions,
  };

  return new GraphQLUnionType(config);
}

function mergeEnumTypeCandidates(typeName: string, candidates: Array<MergeTypeCandidate>): GraphQLEnumType {
  const descriptions = pluck<string>('description', candidates);
  const description = descriptions[descriptions.length - 1];

  const configs = candidates.map(candidate => (candidate.type as GraphQLEnumType).toConfig());
  const values = configs.reduce<GraphQLEnumValueConfigMap>(
    (acc, config) => ({
      ...acc,
      ...config.values,
    }),
    {}
  );

  const astNodes = pluck<EnumTypeDefinitionNode>('astNode', candidates);
  const astNode = astNodes
    .slice(1)
    .reduce((acc, astNode) => mergeEnum(astNode, acc as EnumTypeDefinitionNode) as EnumTypeDefinitionNode, astNodes[0]);

  const extensionASTNodes = [].concat(pluck<Record<string, any>>('extensionASTNodes', candidates));

  const extensions = Object.assign({}, ...pluck<Record<string, any>>('extensions', candidates));

  const config = {
    name: typeName,
    description,
    values,
    astNode,
    extensionASTNodes,
    extensions,
  };

  return new GraphQLEnumType(config);
}

function mergeScalarTypeCandidates(typeName: string, candidates: Array<MergeTypeCandidate>): GraphQLScalarType {
  const descriptions = pluck<string>('description', candidates);
  const description = descriptions[descriptions.length - 1];

  const serializeFns = pluck<GraphQLScalarSerializer<any>>('serialize', candidates);
  const serialize = serializeFns[serializeFns.length - 1];

  const parseValueFns = pluck<GraphQLScalarValueParser<any>>('parseValue', candidates);
  const parseValue = parseValueFns[descriptions.length - 1];

  const parseLiteralFns = pluck<GraphQLScalarLiteralParser<any>>('parseLiteral', candidates);
  const parseLiteral = parseLiteralFns[descriptions.length - 1];

  const astNodes = pluck<ScalarTypeDefinitionNode>('astNode', candidates);
  const astNode = astNodes
    .slice(1)
    .reduce((acc, astNode) => mergeScalarTypeDefinitionNodes(acc as ScalarTypeDefinitionNode, astNode), astNodes[0]);

  const extensionASTNodes = [].concat(pluck<Record<string, any>>('extensionASTNodes', candidates));

  const extensions = Object.assign({}, ...pluck<Record<string, any>>('extensions', candidates));

  const config = {
    name: typeName,
    description,
    serialize,
    parseValue,
    parseLiteral,
    astNode,
    extensionASTNodes,
    extensions,
  };

  return new GraphQLScalarType(config);
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
