import { IGraphQLToolsResolveInfo } from '../Interfaces';
/**
 * Resolver that knows how to:
 * a) handle aliases for proxied schemas
 * b) handle errors from proxied schemas
 * c) handle external to internal enum coversion
 */
export default function defaultMergedResolver(parent: Record<string, any>, args: Record<string, any>, context: Record<string, any>, info: IGraphQLToolsResolveInfo): any;
