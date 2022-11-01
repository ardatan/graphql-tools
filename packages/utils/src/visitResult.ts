import { getOperationASTFromRequest } from './getOperationASTFromRequest.js';
import {
  GraphQLSchema,
  Kind,
  GraphQLObjectType,
  FieldNode,
  GraphQLOutputType,
  isListType,
  getNullableType,
  isAbstractType,
  isObjectType,
  OperationDefinitionNode,
  GraphQLError,
  TypeNameMetaFieldDef,
  FragmentDefinitionNode,
  SchemaMetaFieldDef,
} from 'graphql';
import { collectFields, collectSubFields } from './collectFields.js';

import { ExecutionRequest, ExecutionResult } from './Interfaces.js';
import { Maybe } from './types.js';

export type ValueVisitor = (value: any) => any;

export type ObjectValueVisitor = {
  __enter?: ValueVisitor;
  __leave?: ValueVisitor;
} & Record<string, ValueVisitor>;

export type ResultVisitorMap = Record<string, ValueVisitor | ObjectValueVisitor>;

export type ErrorVisitor = (error: GraphQLError, pathIndex: number) => GraphQLError;

export type ErrorVisitorMap = {
  __unpathed?: (error: GraphQLError) => GraphQLError;
} & Record<string, Record<string, ErrorVisitor>>;

interface SegmentInfo {
  type: GraphQLObjectType;
  fieldName: string;
  pathIndex: number;
}

interface ErrorInfo {
  segmentInfoMap: Map<GraphQLError, Array<SegmentInfo>>;
  unpathedErrors: Set<GraphQLError>;
}

interface SortedErrors {
  errorMap: Record<string, Array<GraphQLError>>;
  unpathedErrors: Set<GraphQLError>;
}

export function visitData(data: any, enter?: ValueVisitor, leave?: ValueVisitor): any {
  if (Array.isArray(data)) {
    return data.map(value => visitData(value, enter, leave));
  } else if (typeof data === 'object') {
    const newData = enter != null ? enter(data) : data;

    if (newData != null) {
      for (const key in newData) {
        const value = newData[key];
        Object.defineProperty(newData, key, {
          value: visitData(value, enter, leave),
        });
      }
    }

    return leave != null ? leave(newData) : newData;
  }

  return data;
}

export function visitErrors(
  errors: ReadonlyArray<GraphQLError>,
  visitor: (error: GraphQLError) => GraphQLError
): Array<GraphQLError> {
  return errors.map(error => visitor(error));
}
export function visitResult(
  result: ExecutionResult,
  request: ExecutionRequest,
  schema: GraphQLSchema,
  resultVisitorMap?: ResultVisitorMap,
  errorVisitorMap?: ErrorVisitorMap
): any {
  const fragments = request.document.definitions.reduce((acc, def) => {
    if (def.kind === Kind.FRAGMENT_DEFINITION) {
      acc[def.name.value] = def;
    }
    return acc;
  }, {});

  const variableValues = request.variables || {};

  const errorInfo: ErrorInfo = {
    segmentInfoMap: new Map<GraphQLError, Array<SegmentInfo>>(),
    unpathedErrors: new Set<GraphQLError>(),
  };

  const data = result.data;
  const errors = result.errors;
  const visitingErrors = errors != null && errorVisitorMap != null;

  const operationDocumentNode = getOperationASTFromRequest(request);

  if (data != null && operationDocumentNode != null) {
    result.data = visitRoot(
      data,
      operationDocumentNode,
      schema,
      fragments,
      variableValues,
      resultVisitorMap,
      visitingErrors ? errors : undefined,
      errorInfo
    );
  }

  if (errors != null && errorVisitorMap) {
    result.errors = visitErrorsByType(errors, errorVisitorMap, errorInfo);
  }

  return result;
}

function visitErrorsByType(
  errors: ReadonlyArray<GraphQLError>,
  errorVisitorMap: ErrorVisitorMap,
  errorInfo: ErrorInfo
): Array<GraphQLError> {
  const segmentInfoMap = errorInfo.segmentInfoMap;
  const unpathedErrors = errorInfo.unpathedErrors;
  const unpathedErrorVisitor = errorVisitorMap['__unpathed'];

  return errors.map(originalError => {
    const pathSegmentsInfo = segmentInfoMap.get(originalError);
    const newError =
      pathSegmentsInfo == null
        ? originalError
        : pathSegmentsInfo.reduceRight((acc, segmentInfo) => {
            const typeName = segmentInfo.type.name;
            const typeVisitorMap = errorVisitorMap[typeName];
            if (typeVisitorMap == null) {
              return acc;
            }
            const errorVisitor = typeVisitorMap[segmentInfo.fieldName];
            return errorVisitor == null ? acc : errorVisitor(acc, segmentInfo.pathIndex);
          }, originalError);

    if (unpathedErrorVisitor && unpathedErrors.has(originalError)) {
      return unpathedErrorVisitor(newError);
    }

    return newError;
  });
}

function getOperationRootType(schema: GraphQLSchema, operationDef: OperationDefinitionNode) {
  switch (operationDef.operation) {
    case 'query':
      return schema.getQueryType();
    case 'mutation':
      return schema.getMutationType();
    case 'subscription':
      return schema.getSubscriptionType();
  }
}

function visitRoot(
  root: any,
  operation: OperationDefinitionNode,
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>,
  resultVisitorMap: Maybe<ResultVisitorMap>,
  errors: Maybe<ReadonlyArray<GraphQLError>>,
  errorInfo: ErrorInfo
): any {
  const operationRootType = getOperationRootType(schema, operation)!;
  const { fields: collectedFields } = collectFields(
    schema,
    fragments,
    variableValues,
    operationRootType,
    operation.selectionSet
  );

  return visitObjectValue(
    root,
    operationRootType,
    collectedFields,
    schema,
    fragments,
    variableValues,
    resultVisitorMap,
    0,
    errors,
    errorInfo
  );
}

function visitObjectValue(
  object: Record<string, any>,
  type: GraphQLObjectType,
  fieldNodeMap: Map<string, FieldNode[]>,
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>,
  resultVisitorMap: Maybe<ResultVisitorMap>,
  pathIndex: number,
  errors: Maybe<ReadonlyArray<GraphQLError>>,
  errorInfo: ErrorInfo
): Record<string, any> {
  const fieldMap = type.getFields();
  const typeVisitorMap = resultVisitorMap?.[type.name] as ObjectValueVisitor;

  const enterObject = typeVisitorMap?.__enter as ValueVisitor;
  const newObject = enterObject != null ? enterObject(object) : object;

  let sortedErrors: SortedErrors;
  let errorMap: Maybe<Record<string, Array<GraphQLError>>> = null;
  if (errors != null) {
    sortedErrors = sortErrorsByPathSegment(errors, pathIndex);
    errorMap = sortedErrors.errorMap;
    for (const error of sortedErrors.unpathedErrors) {
      errorInfo.unpathedErrors.add(error);
    }
  }

  for (const [responseKey, subFieldNodes] of fieldNodeMap) {
    const fieldName = subFieldNodes[0].name.value;
    let fieldType = fieldMap[fieldName]?.type;
    if (fieldType == null) {
      switch (fieldName) {
        case '__typename':
          fieldType = TypeNameMetaFieldDef.type;
          break;
        case '__schema':
          fieldType = SchemaMetaFieldDef.type;
          break;
      }
    }

    const newPathIndex = pathIndex + 1;

    let fieldErrors: Array<GraphQLError> | undefined;
    if (errorMap) {
      fieldErrors = errorMap[responseKey];
      if (fieldErrors != null) {
        delete errorMap[responseKey];
      }
      addPathSegmentInfo(type, fieldName, newPathIndex, fieldErrors, errorInfo);
    }

    const newValue = visitFieldValue(
      object[responseKey],
      fieldType,
      subFieldNodes,
      schema,
      fragments,
      variableValues,
      resultVisitorMap,
      newPathIndex,
      fieldErrors,
      errorInfo
    );

    updateObject(newObject, responseKey, newValue, typeVisitorMap, fieldName);
  }

  const oldTypename = newObject.__typename;
  if (oldTypename != null) {
    updateObject(newObject, '__typename', oldTypename, typeVisitorMap, '__typename');
  }

  if (errorMap) {
    for (const errorsKey in errorMap) {
      const errors = errorMap[errorsKey];
      for (const error of errors) {
        errorInfo.unpathedErrors.add(error);
      }
    }
  }

  const leaveObject = typeVisitorMap?.__leave as ValueVisitor;

  return leaveObject != null ? leaveObject(newObject) : newObject;
}

function updateObject(
  object: Record<string, any>,
  responseKey: string,
  newValue: any,
  typeVisitorMap: ObjectValueVisitor,
  fieldName: string
): void {
  if (typeVisitorMap == null) {
    object[responseKey] = newValue;
    return;
  }

  const fieldVisitor = typeVisitorMap[fieldName];
  if (fieldVisitor == null) {
    object[responseKey] = newValue;
    return;
  }

  const visitedValue = fieldVisitor(newValue);
  if (visitedValue === undefined) {
    delete object[responseKey];
    return;
  }

  object[responseKey] = visitedValue;
}

function visitListValue(
  list: Array<any>,
  returnType: GraphQLOutputType,
  fieldNodes: Array<FieldNode>,
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>,
  resultVisitorMap: Maybe<ResultVisitorMap>,
  pathIndex: number,
  errors: ReadonlyArray<GraphQLError>,
  errorInfo: ErrorInfo
): Array<any> {
  return list.map(listMember =>
    visitFieldValue(
      listMember,
      returnType,
      fieldNodes,
      schema,
      fragments,
      variableValues,
      resultVisitorMap,
      pathIndex + 1,
      errors,
      errorInfo
    )
  );
}

function visitFieldValue(
  value: any,
  returnType: GraphQLOutputType,
  fieldNodes: Array<FieldNode>,
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>,
  resultVisitorMap: Maybe<ResultVisitorMap>,
  pathIndex: number,
  errors: ReadonlyArray<GraphQLError> | undefined = [],
  errorInfo: ErrorInfo
): any {
  if (value == null) {
    return value;
  }

  const nullableType = getNullableType(returnType);
  if (isListType(nullableType)) {
    return visitListValue(
      value as Array<any>,
      nullableType.ofType,
      fieldNodes,
      schema,
      fragments,
      variableValues,
      resultVisitorMap,
      pathIndex,
      errors,
      errorInfo
    );
  } else if (isAbstractType(nullableType)) {
    const finalType = schema.getType(value.__typename) as GraphQLObjectType;
    const { fields: collectedFields } = collectSubFields(schema, fragments, variableValues, finalType, fieldNodes);
    return visitObjectValue(
      value,
      finalType,
      collectedFields,
      schema,
      fragments,
      variableValues,
      resultVisitorMap,
      pathIndex,
      errors,
      errorInfo
    );
  } else if (isObjectType(nullableType)) {
    const { fields: collectedFields } = collectSubFields(schema, fragments, variableValues, nullableType, fieldNodes);
    return visitObjectValue(
      value,
      nullableType,
      collectedFields,
      schema,
      fragments,
      variableValues,
      resultVisitorMap,
      pathIndex,
      errors,
      errorInfo
    );
  }

  const typeVisitorMap = resultVisitorMap?.[nullableType.name] as ValueVisitor;
  if (typeVisitorMap == null) {
    return value;
  }

  const visitedValue = typeVisitorMap(value);
  return visitedValue === undefined ? value : visitedValue;
}

function sortErrorsByPathSegment(errors: ReadonlyArray<GraphQLError>, pathIndex: number): SortedErrors {
  const errorMap = Object.create(null);
  const unpathedErrors: Set<GraphQLError> = new Set();
  for (const error of errors) {
    const pathSegment = error.path?.[pathIndex];
    if (pathSegment == null) {
      unpathedErrors.add(error);
      continue;
    }

    if (pathSegment in errorMap) {
      errorMap[pathSegment].push(error);
    } else {
      errorMap[pathSegment] = [error];
    }
  }

  return {
    errorMap,
    unpathedErrors,
  };
}

function addPathSegmentInfo(
  type: GraphQLObjectType,
  fieldName: string,
  pathIndex: number,
  errors: ReadonlyArray<GraphQLError> = [],
  errorInfo: ErrorInfo
) {
  for (const error of errors) {
    const segmentInfo = {
      type,
      fieldName,
      pathIndex,
    };
    const pathSegmentsInfo = errorInfo.segmentInfoMap.get(error);
    if (pathSegmentsInfo == null) {
      errorInfo.segmentInfoMap.set(error, [segmentInfo]);
    } else {
      pathSegmentsInfo.push(segmentInfo);
    }
  }
}
