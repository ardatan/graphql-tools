import { Args } from './types/common';
import { Output, IOutput } from './Output';
export declare class Variables {
  json: any;
  overwriteSyntax: RegExp;
  envRefSyntax: RegExp;
  selfRefSyntax: RegExp;
  stringRefSyntax: RegExp;
  optRefSyntax: RegExp;
  variableSyntax: RegExp;
  fileName: string;
  options: Args;
  out: Output;
  envVars: any;
  constructor(fileName: string, options?: Args, out?: IOutput, envVars?: any);
  populateJson(json: any): Promise<any>;
  populateObject(objectToPopulate: any): Promise<any>;
  populateProperty(propertyParam: any, populateInPlace?: boolean): any;
  populateVariable(propertyParam: any, matchedString: any, valueToPopulate: any): Promise<any>;
  overwrite(variableStringsString: any): Promise<any>;
  getValueFromSource(variableString: any): Promise<any>;
  getValueFromEnv(variableString: any): Promise<any>;
  getValueFromString(variableString: any): Promise<any>;
  getValueFromOptions(variableString: any): Promise<string | boolean | Args>;
  getValueFromSelf(variableString: any): Promise<any>;
  getDeepValue(deepProperties: any, valueToPopulate: any): Promise<any>;
  warnIfNotFound(variableString: any, valueToPopulate: any): boolean;
}
