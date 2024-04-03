import { GraphQLSchema } from 'graphql';
import { delegateToSchema, isSubschemaConfig, StitchingInfo } from '@graphql-tools/delegate';
import { getFragmentsFromDocument } from '@graphql-tools/executor';
import {
  collectFields,
  ExecutionRequest,
  getDefinedRootType,
  getOperationASTFromRequest,
} from '@graphql-tools/utils';

/**
 * Creates an executor that uses the schema created by stitching together multiple subschemas.
 * Not ready for production
 * Breaking changes can be introduced in the meanwhile
 *
 * @experimental
 *
 */
export function createStitchingExecutor(stitchedSchema: GraphQLSchema) {
  const subschemas = [
    ...(stitchedSchema.extensions?.['stitchingInfo'] as StitchingInfo).subschemaMap.values(),
  ];
  return async function stitchingExecutor(executorRequest: ExecutionRequest) {
    const fragments = getFragmentsFromDocument(executorRequest.document);
    const operation = getOperationASTFromRequest(executorRequest);
    const rootType = getDefinedRootType(stitchedSchema, operation.operation);
    const { fields } = collectFields(
      stitchedSchema,
      fragments,
      executorRequest.variables,
      rootType,
      operation.selectionSet,
    );
    const data: Record<string, any> = {};
    for (const [fieldName, fieldGroups] of fields) {
      const responseKey = fieldGroups[0].fieldNode.alias?.value ?? fieldName;
      const subschemaForField = subschemas.find(subschema => {
        const subschemaSchema = isSubschemaConfig(subschema)
          ? subschema.schema
          : (subschema as GraphQLSchema);
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
          fieldNodes: fieldGroups.map(group => group.fieldNode),
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
