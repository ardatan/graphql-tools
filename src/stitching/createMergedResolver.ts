import { IFieldResolver } from '../Interfaces';
import { defaultMergedResolver } from '../stitching';
import { GraphQLObjectType } from 'graphql';
import { extractOneLevelOfFields } from './extractFields';

export function wrapField(wrapper: string, fieldName: string): IFieldResolver<any, any> {
  return createMergedResolver({ fromPath: [wrapper, fieldName] });
}

export function extractField(fieldName: string): IFieldResolver<any, any> {
  return createMergedResolver({ toPath: [fieldName] });
}

export function renameField(fieldName: string): IFieldResolver<any, any> {
  return createMergedResolver({ fromPath: [fieldName] });
}

export function createMergedResolver({
  fromPath = [],
  toPath = [],
}: {
  toPath?: Array<string>;
  fromPath?: Array<string>;
}): IFieldResolver<any, any> {
  return (parent, args, context, info) => {

    let fieldNodes = info.fieldNodes;
    let returnType = info.returnType;
    let parentType = info.parentType;
    let path = info.path;

    toPath.forEach(pathSegment => {
      fieldNodes = extractOneLevelOfFields(fieldNodes, pathSegment, info.fragments);
      parentType = returnType as GraphQLObjectType;
      returnType = (returnType as GraphQLObjectType).getFields()[pathSegment].type;
      path = { prev: path, key: pathSegment };
    });

    if (!fieldNodes.length) {
      return null;
    }

    let fieldName;

    const fromPathLength = fromPath.length;
    if (fromPathLength) {
      parent = fromPath.slice(0, -1).reduce((p, pathSegment) => p[pathSegment], parent);
      fieldName = fromPath[fromPathLength - 1];
    }

    if (!fieldName) {
      fieldName = toPath[toPath.length - 1];
    }

    return defaultMergedResolver(parent, args, context, {
      ...info,
      fieldName,
      fieldNodes,
      returnType,
      parentType,
      path,
    });
  };
}
