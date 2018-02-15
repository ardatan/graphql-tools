import { GraphQLSchema } from 'graphql';
import { Request, Result } from '../Interfaces';

export type Transform = {
  transformSchema?: (schema: GraphQLSchema) => GraphQLSchema;
  transformRequest?: (originalRequest: Request) => Request;
  transformResult?: (result: Result) => Result;
};

export function applySchemaTransforms(
  originalSchema: GraphQLSchema,
  transforms: Array<Transform>,
): GraphQLSchema {
  return transforms.reduce(
    (schema: GraphQLSchema, transform: Transform) =>
      transform.transformSchema ? transform.transformSchema(schema) : schema,
    originalSchema,
  );
}

export function applyRequestTransforms(
  originalRequest: Request,
  transforms: Array<Transform>,
): Request {
  return transforms.reduce(
    (request: Request, transform: Transform) =>
      transform.transformRequest
        ? transform.transformRequest(request)
        : request,

    originalRequest,
  );
}

export function applyResultTransforms(
  originalResult: any,
  transforms: Array<Transform>,
): any {
  return transforms.reduce(
    (result: any, transform: Transform) =>
      transform.transformResult ? transform.transformResult(result) : result,
    originalResult,
  );
}
