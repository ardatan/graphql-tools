import { GraphQLSchema } from 'graphql';

import { Request, Transform } from '../Interfaces';
import { cloneSchema } from '../utils/index';

export function applySchemaTransforms(
  originalSchema: GraphQLSchema,
  transforms: Array<Transform>,
): GraphQLSchema {
  return transforms.reduce(
    (schema: GraphQLSchema, transform: Transform) =>
      transform.transformSchema != null
        ? transform.transformSchema(cloneSchema(schema))
        : schema,
    originalSchema,
  );
}

export function applyRequestTransforms(
  originalRequest: Request,
  transforms: Array<Transform>,
): Request {
  return transforms.reduce(
    (request: Request, transform: Transform) =>
      transform.transformRequest != null
        ? transform.transformRequest(request)
        : request,

    originalRequest,
  );
}

export function applyResultTransforms(
  originalResult: any,
  transforms: Array<Transform>,
): any {
  return transforms.reduceRight(
    (result: any, transform: Transform) =>
      transform.transformResult != null
        ? transform.transformResult(result)
        : result,
    originalResult,
  );
}
