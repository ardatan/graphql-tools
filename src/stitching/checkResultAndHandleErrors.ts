import {
  GraphQLResolveInfo,
  responsePathAsArray,
  getNullableType,
  isCompositeType,
  isLeafType,
  isListType,
  ExecutionResult,
  GraphQLCompositeType,
  GraphQLError,
  GraphQLType,
  GraphQLSchema,
  FieldNode,
  isAbstractType,
} from 'graphql';
import { getResponseKeyFromInfo } from './getResponseKeyFromInfo';
import {
  relocatedError,
  combineErrors,
  createMergedResult
} from './errors';
import {
  SubschemaConfig,
  IGraphQLToolsResolveInfo,
  Path,
} from '../Interfaces';
import resolveFromParentTypename from './resolveFromParentTypename';

export function checkResultAndHandleErrors(
  result: ExecutionResult,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  responseKey?: string,
  subschema?: GraphQLSchema | SubschemaConfig,
): any {
  if (!responseKey) {
    responseKey = getResponseKeyFromInfo(info);
  }

  if (!result.data || result.data[responseKey] == null) {
    return (result.errors) ? handleErrors(info.fieldNodes, info.path, result.errors) : null;
  }

  return handleResult(
    getNullableType(info.returnType),
    result.data[responseKey],
    result.errors || [],
    [subschema],
    context,
    info,
  );
}

export function handleResult(
  type: GraphQLType,
  result: any,
  errors: ReadonlyArray<GraphQLError>,
  subschemas: Array<GraphQLSchema | SubschemaConfig>,
  context: Record<string, any>,
  info: IGraphQLToolsResolveInfo,
): any {
  if (isLeafType(type)) {
    return type.parseValue(result);
  } else if (isCompositeType(type)) {
    return mergeResultsFromOtherSubschemas(
      type,
      createMergedResult(result, errors, subschemas),
      subschemas,
      context,
      info,
    );
  } else if (isListType(type)) {
    return createMergedResult(result, errors, subschemas).map(
      (r: any) => handleListResult(
        getNullableType(type.ofType),
        r,
        subschemas,
        context,
        info,
      )
    );
  }
}

function handleListResult(
  type: GraphQLType,
  result: any,
  subschemas: Array<GraphQLSchema | SubschemaConfig>,
  context: Record<string, any>,
  info: IGraphQLToolsResolveInfo,
) {
  if (isLeafType(type)) {
    return type.parseValue(result);
  } else if (isCompositeType(type)) {
    return mergeResultsFromOtherSubschemas(
      type,
      result,
      subschemas,
      context,
      info
    );
  } else if (isListType(type)) {
    return result.map((r: any) => handleListResult(
      getNullableType(type.ofType),
      r,
      subschemas,
      context,
      info,
  ));
  }
}

async function mergeResultsFromOtherSubschemas(
  type: GraphQLCompositeType,
  result: any,
  subschemas: Array<GraphQLSchema | SubschemaConfig>,
  context: Record<string, any>,
  info: IGraphQLToolsResolveInfo,
): Promise<any> {
  if (info.mergeInfo) {
    let typeName: string;
    if (isAbstractType(type)) {
      typeName = info.schema.getTypeMap()[resolveFromParentTypename(result)].name;
    } else {
      typeName = type.name;
    }

    const initialSchemas =
      info.mergeInfo.mergedTypes[typeName] &&
      info.mergeInfo.mergedTypes[typeName].subschemas;
    if (initialSchemas) {
      const remainingSubschemas = initialSchemas.filter(
        subschema => !subschemas.includes(subschema)
      );
      if (remainingSubschemas.length) {
        const results = await Promise.all(remainingSubschemas.map(subschema => {
          const mergedTypeResolver = subschema.mergedTypeConfigs[typeName].mergedTypeResolver;
          return mergedTypeResolver(subschema, result, context, {
            ...info,
            mergeInfo: {
              ...info.mergeInfo,
              mergedTypes: {},
            },
          });
        }));
        results.forEach((r: ExecutionResult) => Object.assign(result, r));
      }
    }
  }

  return result;
}

export function handleErrors(
  fieldNodes: ReadonlyArray<FieldNode>,
  path: Path,
  errors: ReadonlyArray<GraphQLError>,
) {
  throw relocatedError(
    combineErrors(errors),
    fieldNodes,
    responsePathAsArray(path)
  );
}
