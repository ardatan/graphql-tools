import {
  GraphQLNamedType,
  GraphQLSchema,
  SelectionSetNode,
  DocumentNode,
  InlineFragmentNode,
  FieldNode,
} from 'graphql';
import { ITypeDefinitions, TypeMap } from '@graphql-tools/utils';
import { SubschemaConfig } from '@graphql-tools/delegate';
import { IExecutableSchemaDefinition } from '@graphql-tools/schema';

export type MergeTypeCandidate = {
  type: GraphQLNamedType;
  schema?: GraphQLSchema;
  subschema?: GraphQLSchema | SubschemaConfig;
  transformedSubschema?: GraphQLSchema;
};

export type MergeTypeFilter = (mergeTypeCandidates: Array<MergeTypeCandidate>, typeName: string) => boolean;

export interface MergedTypeInfo {
  typeName: string;
  targetSubschemas: Map<GraphQLSchema | SubschemaConfig, Array<SubschemaConfig>>;
  uniqueFields: Record<string, SubschemaConfig>;
  nonUniqueFields: Record<string, Array<SubschemaConfig>>;
  typeMaps: Map<GraphQLSchema | SubschemaConfig, TypeMap>;
  selectionSets: Map<SubschemaConfig, SelectionSetNode>;
  fieldSelectionSets: Map<SubschemaConfig, Record<string, SelectionSetNode>>;
}

export interface StitchingInfo {
  transformedSchemas: Map<GraphQLSchema | SubschemaConfig, GraphQLSchema>;
  fragmentsByField: Record<string, Record<string, InlineFragmentNode>>;
  selectionSetsByField: Record<string, Record<string, SelectionSetNode>>;
  dynamicSelectionSetsByField: Record<string, Record<string, Array<(node: FieldNode) => SelectionSetNode>>>;
  mergedTypes: Record<string, MergedTypeInfo>;
}

export type SchemaLikeObject = SubschemaConfig | GraphQLSchema | string | DocumentNode | Array<GraphQLNamedType>;

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

declare module '@graphql-tools/utils' {
  interface IFieldResolverOptions<TSource = any, TContext = any, TArgs = any> {
    fragment?: string;
    selectionSet?: string | ((node: FieldNode) => SelectionSetNode);
  }
}
