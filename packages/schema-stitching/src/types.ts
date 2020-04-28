import { GraphQLNamedType, GraphQLSchema, SelectionSetNode } from 'graphql';
import {
  SubschemaConfig,
  ReplacementSelectionSetMapping,
  ReplacementFragmentMapping,
  IResolvers,
  ITypeDefinitions,
  SchemaLikeObject,
  Transform,
  TypeMap,
} from '@graphql-tools/utils';
import { GraphQLResolveInfo } from 'graphql/type';
import { IDelegateToSchemaOptions } from '@graphql-tools/schema-wrapping';
import { IExecutableSchemaDefinition } from '@graphql-tools/schema-generator';

export type MergeTypeCandidate = {
  type: GraphQLNamedType;
  schema?: GraphQLSchema;
  subschema?: GraphQLSchema | SubschemaConfig;
  transformedSubschema?: GraphQLSchema;
};

export type MergeTypeFilter = (mergeTypeCandidates: Array<MergeTypeCandidate>, typeName: string) => boolean;

declare module 'graphql' {
  interface GraphQLResolveInfo {
    mergeInfo?: MergeInfo;
  }
}

export interface MergedTypeInfo {
  subschemas: Array<SubschemaConfig>;
  selectionSet?: SelectionSetNode;
  uniqueFields: Record<string, SubschemaConfig>;
  nonUniqueFields: Record<string, Array<SubschemaConfig>>;
  typeMaps: Map<SubschemaConfig, TypeMap>;
  selectionSets: Map<SubschemaConfig, SelectionSetNode>;
  containsSelectionSet: Map<SubschemaConfig, Map<SelectionSetNode, boolean>>;
}

export interface MergeInfo {
  delegate: (
    type: 'query' | 'mutation' | 'subscription',
    fieldName: string,
    args: Record<string, any>,
    context: Record<string, any>,
    info: GraphQLResolveInfo,
    transforms?: Array<Transform>
  ) => any;
  fragments: Array<{
    field: string;
    fragment: string;
  }>;
  replacementSelectionSets: ReplacementSelectionSetMapping;
  replacementFragments: ReplacementFragmentMapping;
  mergedTypes: Record<string, MergedTypeInfo>;
  delegateToSchema<TContext, TArgs>(options: IDelegateToSchemaOptions<TContext, TArgs>): any;
}

export type IResolversParameter =
  | Array<IResolvers | ((mergeInfo: MergeInfo) => IResolvers)>
  | IResolvers
  | ((mergeInfo: MergeInfo) => IResolvers);

export interface IStitchSchemasOptions<TContext = any> extends Omit<IExecutableSchemaDefinition<TContext>, 'typeDefs'> {
  subschemas?: Array<GraphQLSchema | SubschemaConfig>;
  typeDefs?: ITypeDefinitions;
  types?: Array<GraphQLNamedType>;
  schemas?: Array<SchemaLikeObject>;
  onTypeConflict?: OnTypeConflict;
  mergeTypes?: boolean | Array<string> | MergeTypeFilter;
  mergeDirectives?: boolean;
}

export type OnTypeConflict = (
  left: GraphQLNamedType,
  right: GraphQLNamedType,
  info?: {
    left: {
      schema?: GraphQLSchema | SubschemaConfig;
    };
    right: {
      schema?: GraphQLSchema | SubschemaConfig;
    };
  }
) => GraphQLNamedType;
