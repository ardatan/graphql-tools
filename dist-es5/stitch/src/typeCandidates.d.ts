import {
  DocumentNode,
  GraphQLNamedType,
  GraphQLDirective,
  SchemaDefinitionNode,
  SchemaExtensionNode,
  GraphQLSchema,
  OperationTypeNode,
} from 'graphql';
import { Subschema, SubschemaConfig, StitchingInfo } from '@graphql-tools/delegate';
import { GraphQLParseOptions, TypeSource } from '@graphql-tools/utils';
import { MergeTypeCandidate, MergeTypeFilter, OnTypeConflict, TypeMergingOptions } from './types';
export declare function buildTypeCandidates<TContext = Record<string, any>>({
  subschemas,
  originalSubschemaMap,
  types,
  typeDefs,
  parseOptions,
  extensions,
  directiveMap,
  schemaDefs,
  mergeDirectives,
}: {
  subschemas: Array<Subschema<any, any, any, TContext>>;
  originalSubschemaMap: Map<
    Subschema<any, any, any, TContext>,
    GraphQLSchema | SubschemaConfig<any, any, any, TContext>
  >;
  types: Array<GraphQLNamedType>;
  typeDefs: TypeSource;
  parseOptions: GraphQLParseOptions;
  extensions: Array<DocumentNode>;
  directiveMap: Record<string, GraphQLDirective>;
  schemaDefs: {
    schemaDef: SchemaDefinitionNode;
    schemaExtensions: Array<SchemaExtensionNode>;
  };
  mergeDirectives?: boolean | undefined;
}): [Record<string, Array<MergeTypeCandidate<TContext>>>, Record<OperationTypeNode, string>];
export declare function buildTypes<TContext = Record<string, any>>({
  typeCandidates,
  directives,
  stitchingInfo,
  rootTypeNames,
  onTypeConflict,
  mergeTypes,
  typeMergingOptions,
}: {
  typeCandidates: Record<string, Array<MergeTypeCandidate<TContext>>>;
  directives: Array<GraphQLDirective>;
  stitchingInfo: StitchingInfo<TContext>;
  rootTypeNames: Array<string>;
  onTypeConflict?: OnTypeConflict<TContext>;
  mergeTypes: boolean | Array<string> | MergeTypeFilter<TContext>;
  typeMergingOptions?: TypeMergingOptions<TContext>;
}): {
  typeMap: Record<string, GraphQLNamedType>;
  directives: Array<GraphQLDirective>;
};
