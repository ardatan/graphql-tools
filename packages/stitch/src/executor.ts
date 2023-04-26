import { ExecutionRequest, collectFields, getDefinedRootType, getOperationASTFromRequest } from '@graphql-tools/utils';
import { stitchSchemas } from './stitchSchemas.js';
import { IStitchSchemasOptions } from './types.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import { getFragmentsFromDocument } from '@graphql-tools/executor';
import { StitchingInfo, delegateToSchema, isSubschemaConfig } from '@graphql-tools/delegate';
import { GraphQLSchema } from 'graphql';

export function createStitchingExecutor(opts: IStitchSchemasOptions) {
  const stitchedSchema = stitchSchemas(opts);
  const subschemas = [...(stitchedSchema.extensions['stitchingInfo'] as StitchingInfo).subschemaMap.values()];
  return async function stitchingExecutor(executorRequest: ExecutionRequest) {
    const fragments = getFragmentsFromDocument(executorRequest.document);
    const operation = getOperationASTFromRequest(executorRequest);
    const rootType = getDefinedRootType(stitchedSchema, operation.operation);
    const { fields } = collectFields(
      stitchedSchema,
      fragments,
      executorRequest.variables,
      rootType,
      operation.selectionSet
    );
    const data: Record<string, any> = {};
    for (const [fieldName, fieldNodes] of fields) {
      const responseKey = fieldNodes[0].alias?.value ?? fieldName;
      const subschemaForField = subschemas.find(subschema => {
        const subschemaSchema = isSubschemaConfig(subschema) ? subschema.schema : (subschema as GraphQLSchema);
        const rootType = getDefinedRootType(subschemaSchema, operation.operation);
        return rootType.getFields()[fieldName] != null;
      });
      let result = await delegateToSchema({
        schema: subschemaForField || stitchedSchema,
        rootValue: executorRequest.rootValue,
        context: executorRequest.context,
        info: {
          schema: stitchedSchema,
          fieldName,
          fieldNodes,
          operation,
          fragments,
          parentType: rootType,
          returnType: rootType.getFields()[fieldName].type,
          variableValues: executorRequest.variables,
        } as any,
      });
      if (Array.isArray(result)) {
        result = await Promise.all(result);
      }
      data[responseKey] = result;
    }
    return { data };
  };
}
