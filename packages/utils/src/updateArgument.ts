import { GraphQLInputType, ArgumentNode, VariableDefinitionNode, Kind } from 'graphql';

import { astFromType } from './astFromType';

export function updateArgument(
  argName: string,
  argType: GraphQLInputType,
  argumentNodes: Record<string, ArgumentNode>,
  variableDefinitionsMap: Record<string, VariableDefinitionNode>,
  variableValues: Record<string, any>,
  newArg: any
): void {
  let varName;
  let numGeneratedVariables = 0;
  do {
    varName = `_v${(numGeneratedVariables++).toString()}_${argName}`;
  } while (varName in variableDefinitionsMap);

  argumentNodes[argName] = {
    kind: Kind.ARGUMENT,
    name: {
      kind: Kind.NAME,
      value: argName,
    },
    value: {
      kind: Kind.VARIABLE,
      name: {
        kind: Kind.NAME,
        value: varName,
      },
    },
  };
  variableDefinitionsMap[varName] = {
    kind: Kind.VARIABLE_DEFINITION,
    variable: {
      kind: Kind.VARIABLE,
      name: {
        kind: Kind.NAME,
        value: varName,
      },
    },
    type: astFromType(argType),
  };

  variableValues[varName] = newArg;
}
