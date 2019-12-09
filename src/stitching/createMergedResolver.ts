import { GraphQLObjectType, getNamedType, responsePathAsArray } from 'graphql';
import { IFieldResolver } from '../Interfaces';
import {
  getErrors,
  getSubschemas,
} from './proxiedResult';
import defaultMergedResolver from './defaultMergedResolver';
import { extractOneLevelOfFields } from './extractFields';
import { handleNull, handleObject } from './checkResultAndHandleErrors';

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
  fromPath?: Array<string>;
  toPath?: Array<string>;
}): IFieldResolver<any, any> {
  return async (parent, args, context, info) => {

    let fieldNodes = info.fieldNodes;
    let returnType = info.returnType;
    let parentType = info.parentType;
    let path = info.path;

    toPath.forEach(pathSegment => {
      fieldNodes = extractOneLevelOfFields(fieldNodes, pathSegment, info.fragments);
      parentType = getNamedType(returnType) as GraphQLObjectType;
      returnType = (parentType as GraphQLObjectType).getFields()[pathSegment].type;
      path = { prev: path, key: pathSegment };
    });

    if (!fieldNodes.length) {
      return null;
    }

    let fieldName;

    const fromPathLength = fromPath.length;
    if (fromPathLength) {
      const fromParentPathLength = fromPathLength - 1;

      for (let i = 0; i < fromParentPathLength; i++) {
        const responseKey = fromPath[i];
        const errors = getErrors(parent, responseKey);
        const subschemas = getSubschemas(parent);
        const result = parent[responseKey];
        if (result == null) {
          return handleNull(fieldNodes, responsePathAsArray(path), errors);
        }
        parent = handleObject(result, errors, subschemas);
      }

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
