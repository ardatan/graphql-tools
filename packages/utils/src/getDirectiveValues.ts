import {
  DirectiveNode,
  getDirectiveValues as getDirectiveValuesOrig,
  GraphQLDirective,
  versionInfo,
} from 'graphql';
import { VariableValues } from './types.js';

/**
 * GraphQL v17's getDirectiveValues function accepts `VariableValues`
 * while older versions accept `Record<string, any>`. This function wraps the original
 * getDirectiveValues function to provide compatibility across versions.
 */
export function getDirectiveValues(
  directiveDef: GraphQLDirective,
  node: {
    readonly directives?: ReadonlyArray<DirectiveNode> | undefined;
  },
  variableValues?: VariableValues,
): undefined | Record<string, unknown> {
  if (versionInfo.major >= 17) {
    return getDirectiveValuesOrig(directiveDef, node, variableValues as any);
  }
  return getDirectiveValuesOrig(directiveDef, node, variableValues?.coerced as any);
}
