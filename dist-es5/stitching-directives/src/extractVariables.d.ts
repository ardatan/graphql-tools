import { ValueNode } from 'graphql';
declare type VariablePaths = Record<string, Array<string | number>>;
export declare function extractVariables(inputValue: ValueNode): {
  inputValue: ValueNode;
  variablePaths: VariablePaths;
};
export {};
