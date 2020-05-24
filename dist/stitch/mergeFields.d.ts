import { FieldNode } from 'graphql';
import { SubschemaConfig, IGraphQLToolsResolveInfo, MergedTypeInfo } from '../Interfaces';
export declare function mergeFields(mergedTypeInfo: MergedTypeInfo, typeName: string, object: any, originalSelections: Array<FieldNode>, sourceSubschemas: Array<SubschemaConfig>, targetSubschemas: Array<SubschemaConfig>, context: Record<string, any>, info: IGraphQLToolsResolveInfo): any;
