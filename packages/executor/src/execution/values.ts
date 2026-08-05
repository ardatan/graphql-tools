import {
  GraphQLError,
  getVariableValues as graphqlGetVariableValues,
  GraphQLSchema,
  VariableDefinitionNode,
  versionInfo,
} from 'graphql';
import { VariableValues } from '@graphql-tools/utils';

export type VariableValuesOrErrors = VariableValues | { errors: ReadonlyArray<GraphQLError> };

export function getVariableValues(
  schema: GraphQLSchema,
  varDefNodes: ReadonlyArray<VariableDefinitionNode>,
  inputs: {
    readonly [variable: string]: unknown;
  },
  options?: {
    maxErrors?: number;
    hideSuggestions?: boolean;
  },
): VariableValuesOrErrors {
  const result = graphqlGetVariableValues(schema, varDefNodes, inputs, options);
  if ('errors' in result && result.errors != null) {
    return { errors: result.errors };
  }
  if (versionInfo.major >= 17 && 'variableValues' in result) {
    return result.variableValues;
  }
  return result as any;
}
