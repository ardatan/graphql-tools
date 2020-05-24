import { IGraphQLToolsResolveInfo } from '../Interfaces';
export declare function isProxiedResult(result: any): any;
export declare function unwrapResult(parent: any, info: IGraphQLToolsResolveInfo, path: Array<string>): any;
export declare function dehoistResult(parent: any, delimeter?: string): any;
export declare function mergeProxiedResults(target: any, ...sources: any): any;
