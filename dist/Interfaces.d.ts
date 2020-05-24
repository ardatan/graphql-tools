import { GraphQLSchema, GraphQLField, GraphQLInputType, GraphQLType, GraphQLNamedType, GraphQLFieldResolver, GraphQLResolveInfo, GraphQLIsTypeOfFn, GraphQLTypeResolver, GraphQLScalarType, DocumentNode, FieldNode, GraphQLEnumValue, GraphQLEnumType, GraphQLUnionType, GraphQLArgument, GraphQLInputField, GraphQLInputObjectType, GraphQLInterfaceType, GraphQLObjectType, InlineFragmentNode, GraphQLOutputType, SelectionSetNode, GraphQLDirective, GraphQLFieldConfig, FragmentDefinitionNode, SelectionNode, VariableDefinitionNode, OperationDefinitionNode, GraphQLError, ExecutionResult as GraphQLExecutionResult } from 'graphql';
import { ApolloLink } from 'apollo-link';
import { SchemaVisitor } from './utils/SchemaVisitor';
import { SchemaDirectiveVisitor } from './utils/SchemaDirectiveVisitor';
export interface ExecutionResult<TData = {
    [key: string]: any;
}> extends GraphQLExecutionResult {
    data?: TData | null;
    extensions?: Record<string, any>;
}
export declare type Result = ExecutionResult;
export declare type TypeMap = Record<string, GraphQLNamedType>;
export interface GraphQLExecutionContext {
    schema: GraphQLSchema;
    fragments: {
        [key: string]: FragmentDefinitionNode;
    };
    rootValue: any;
    contextValue: any;
    operation: OperationDefinitionNode;
    variableValues: {
        [key: string]: any;
    };
    fieldResolver: GraphQLFieldResolver<any, any>;
    errors: Array<GraphQLError>;
}
export interface GraphQLParseOptions {
    noLocation?: boolean;
    allowLegacySDLEmptyFields?: boolean;
    allowLegacySDLImplementsInterfaces?: boolean;
    experimentalFragmentVariables?: boolean;
}
export interface IResolverValidationOptions {
    requireResolversForArgs?: boolean;
    requireResolversForNonScalar?: boolean;
    requireResolversForAllFields?: boolean;
    requireResolversForResolveType?: boolean;
    allowResolversNotInSchema?: boolean;
}
export interface IAddResolveFunctionsToSchemaOptions {
    schema: GraphQLSchema;
    resolvers: IResolvers;
    defaultFieldResolver: IFieldResolver<any, any>;
    resolverValidationOptions: IResolverValidationOptions;
    inheritResolversFromInterfaces: boolean;
}
export interface IAddResolversToSchemaOptions {
    schema: GraphQLSchema;
    resolvers: IResolvers;
    defaultFieldResolver?: IFieldResolver<any, any>;
    resolverValidationOptions?: IResolverValidationOptions;
    inheritResolversFromInterfaces?: boolean;
}
export interface IResolverOptions<TSource = any, TContext = any, TArgs = any> {
    fragment?: string;
    resolve?: IFieldResolver<TSource, TContext, TArgs>;
    subscribe?: IFieldResolver<TSource, TContext, TArgs>;
    extensions?: Record<string, any>;
    __resolveType?: GraphQLTypeResolver<TSource, TContext>;
    __isTypeOf?: GraphQLIsTypeOfFn<TSource, TContext>;
}
export interface Transform {
    transformSchema?: (originalSchema: GraphQLSchema) => GraphQLSchema;
    transformRequest?: (originalRequest: Request) => Request;
    transformResult?: (originalResult: ExecutionResult) => ExecutionResult;
}
export declare type FieldTransformer = (typeName: string, fieldName: string, field: GraphQLField<any, any>) => GraphQLFieldConfig<any, any> | RenamedFieldConfig | null | undefined;
export declare type RootFieldTransformer = (operation: 'Query' | 'Mutation' | 'Subscription', fieldName: string, field: GraphQLField<any, any>) => GraphQLFieldConfig<any, any> | RenamedFieldConfig | null | undefined;
export declare type FieldNodeTransformer = (typeName: string, fieldName: string, fieldNode: FieldNode, fragments: Record<string, FragmentDefinitionNode>) => SelectionNode | Array<SelectionNode>;
export declare type FieldNodeMapper = (fieldNode: FieldNode, fragments: Record<string, FragmentDefinitionNode>) => SelectionNode | Array<SelectionNode>;
export declare type FieldNodeMappers = Record<string, Record<string, FieldNodeMapper>>;
export interface RenamedFieldConfig {
    name: string;
    field?: GraphQLFieldConfig<any, any>;
}
export declare type FieldFilter = (typeName?: string, fieldName?: string, field?: GraphQLField<any, any>) => boolean;
export declare type RootFieldFilter = (operation?: 'Query' | 'Mutation' | 'Subscription', rootFieldName?: string, field?: GraphQLField<any, any>) => boolean;
export declare type RenameTypesOptions = {
    renameBuiltins: boolean;
    renameScalars: boolean;
};
export interface IGraphQLToolsResolveInfo extends GraphQLResolveInfo {
    mergeInfo?: MergeInfo;
}
export declare type Fetcher = (operation: IFetcherOperation) => Promise<ExecutionResult>;
export interface IFetcherOperation {
    query: DocumentNode;
    operationName?: string;
    variables?: {
        [key: string]: any;
    };
    context?: {
        [key: string]: any;
    };
}
export declare type Dispatcher = (context: any) => ApolloLink | Fetcher;
export interface SubschemaConfig {
    schema: GraphQLSchema;
    rootValue?: Record<string, any>;
    link?: ApolloLink;
    fetcher?: Fetcher;
    dispatcher?: Dispatcher;
    createProxyingResolver?: CreateProxyingResolverFn;
    transforms?: Array<Transform>;
    merge?: Record<string, MergedTypeConfig>;
}
export interface MergedTypeConfig {
    selectionSet?: string;
    fieldName?: string;
    args?: (originalResult: any) => Record<string, any>;
    resolve?: MergedTypeResolver;
}
export declare type MergedTypeResolver = (originalResult: any, context: Record<string, any>, info: IGraphQLToolsResolveInfo, subschema: GraphQLSchema | SubschemaConfig, selectionSet: SelectionSetNode) => any;
export interface GraphQLSchemaWithTransforms extends GraphQLSchema {
    transforms?: Array<Transform>;
}
export declare type SchemaLikeObject = SubschemaConfig | GraphQLSchema | string | DocumentNode | Array<GraphQLNamedType>;
export declare function isSubschemaConfig(value: SchemaLikeObject): value is SubschemaConfig;
export interface IDelegateToSchemaOptions<TContext = {
    [key: string]: any;
}> {
    schema: GraphQLSchema | SubschemaConfig;
    operation?: Operation;
    fieldName?: string;
    returnType?: GraphQLOutputType;
    args?: {
        [key: string]: any;
    };
    selectionSet?: SelectionSetNode;
    fieldNodes?: ReadonlyArray<FieldNode>;
    context?: TContext;
    info: IGraphQLToolsResolveInfo;
    rootValue?: Record<string, any>;
    transforms?: Array<Transform>;
    skipValidation?: boolean;
    skipTypeMerging?: boolean;
}
export interface ICreateRequestFromInfo {
    info: IGraphQLToolsResolveInfo;
    operation: Operation;
    fieldName: string;
    selectionSet?: SelectionSetNode;
    fieldNodes?: ReadonlyArray<FieldNode>;
}
export interface ICreateRequest {
    sourceSchema: GraphQLSchema;
    sourceParentType: GraphQLObjectType;
    sourceFieldName: string;
    fragments: Record<string, FragmentDefinitionNode>;
    variableDefinitions: ReadonlyArray<VariableDefinitionNode>;
    variableValues: Record<string, any>;
    targetOperation: Operation;
    targetFieldName: string;
    selectionSet: SelectionSetNode;
    fieldNodes: ReadonlyArray<FieldNode>;
}
export interface IDelegateRequestOptions extends IDelegateToSchemaOptions {
    request: Request;
}
export interface MergeInfo {
    delegate: (type: 'query' | 'mutation' | 'subscription', fieldName: string, args: {
        [key: string]: any;
    }, context: {
        [key: string]: any;
    }, info: GraphQLResolveInfo, transforms?: Array<Transform>) => any;
    fragments: Array<{
        field: string;
        fragment: string;
    }>;
    replacementSelectionSets: ReplacementSelectionSetMapping;
    replacementFragments: ReplacementFragmentMapping;
    mergedTypes: Record<string, MergedTypeInfo>;
    delegateToSchema<TContext>(options: IDelegateToSchemaOptions<TContext>): any;
}
export interface ReplacementSelectionSetMapping {
    [typeName: string]: {
        [fieldName: string]: SelectionSetNode;
    };
}
export interface ReplacementFragmentMapping {
    [typeName: string]: {
        [fieldName: string]: InlineFragmentNode;
    };
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
export declare type IFieldResolver<TSource, TContext, TArgs = Record<string, any>> = (source: TSource, args: TArgs, context: TContext, info: IGraphQLToolsResolveInfo) => any;
export declare type ITypedef = (() => Array<ITypedef>) | string | DocumentNode;
export declare type ITypeDefinitions = ITypedef | Array<ITypedef>;
export interface IResolverObject<TSource = any, TContext = any, TArgs = any> {
    [key: string]: IFieldResolver<TSource, TContext, TArgs> | IResolverOptions<TSource, TContext> | IResolverObject<TSource, TContext>;
}
export interface IEnumResolver {
    [key: string]: string | number;
}
export interface IResolvers<TSource = any, TContext = any> {
    [key: string]: (() => any) | IResolverObject<TSource, TContext> | IResolverOptions<TSource, TContext> | GraphQLScalarType | IEnumResolver;
}
export declare type IResolversParameter = Array<IResolvers | ((mergeInfo: MergeInfo) => IResolvers)> | IResolvers | ((mergeInfo: MergeInfo) => IResolvers);
export interface ILogger {
    log: (error: Error) => void;
}
export declare type IConnectorCls<TContext = any> = new (context?: TContext) => any;
export declare type IConnectorFn<TContext = any> = (context?: TContext) => any;
export declare type IConnector<TContext = any> = IConnectorCls<TContext> | IConnectorFn<TContext>;
export interface IConnectors<TContext = any> {
    [key: string]: IConnector<TContext>;
}
export interface IExecutableSchemaDefinition<TContext = any> {
    typeDefs: ITypeDefinitions;
    resolvers?: IResolvers<any, TContext> | Array<IResolvers<any, TContext>>;
    connectors?: IConnectors<TContext>;
    logger?: ILogger;
    allowUndefinedInResolve?: boolean;
    resolverValidationOptions?: IResolverValidationOptions;
    directiveResolvers?: IDirectiveResolvers<any, TContext>;
    schemaDirectives?: {
        [name: string]: typeof SchemaDirectiveVisitor;
    };
    parseOptions?: GraphQLParseOptions;
    inheritResolversFromInterfaces?: boolean;
}
export declare type IFieldIteratorFn = (fieldDef: GraphQLField<any, any>, typeName: string, fieldName: string) => void;
export declare type IDefaultValueIteratorFn = (type: GraphQLInputType, value: any) => void;
export declare type NextResolverFn = () => Promise<any>;
export declare type DirectiveResolverFn<TSource = any, TContext = any> = (next: NextResolverFn, source: TSource, args: {
    [argName: string]: any;
}, context: TContext, info: GraphQLResolveInfo) => any;
export interface IDirectiveResolvers<TSource = any, TContext = any> {
    [directiveName: string]: DirectiveResolverFn<TSource, TContext>;
}
export declare type IMockFn = GraphQLFieldResolver<any, any>;
export interface IMocks {
    [key: string]: IMockFn;
}
export declare type IMockTypeFn = (type: GraphQLType, typeName?: string, fieldName?: string) => GraphQLFieldResolver<any, any>;
export interface IMockOptions {
    schema?: GraphQLSchema;
    mocks?: IMocks;
    preserveResolvers?: boolean;
}
export interface IMockServer {
    query: (query: string, vars?: {
        [key: string]: any;
    }) => Promise<ExecutionResult>;
}
export declare type OnTypeConflict = (left: GraphQLNamedType, right: GraphQLNamedType, info?: {
    left: {
        schema?: GraphQLSchema | SubschemaConfig;
    };
    right: {
        schema?: GraphQLSchema | SubschemaConfig;
    };
}) => GraphQLNamedType;
export declare type Operation = 'query' | 'mutation' | 'subscription';
export interface Request {
    document: DocumentNode;
    variables: Record<string, any>;
    extensions?: Record<string, any>;
}
export declare type IndexedObject<V> = {
    [key: string]: V;
} | ReadonlyArray<V>;
export declare type VisitableSchemaType = GraphQLSchema | GraphQLObjectType | GraphQLInterfaceType | GraphQLInputObjectType | GraphQLNamedType | GraphQLScalarType | GraphQLField<any, any> | GraphQLInputField | GraphQLArgument | GraphQLUnionType | GraphQLEnumType | GraphQLEnumValue;
export declare type VisitorSelector = (type: VisitableSchemaType, methodName: string) => Array<SchemaVisitor | SchemaVisitorMap>;
export declare enum VisitSchemaKind {
    TYPE = "VisitSchemaKind.TYPE",
    SCALAR_TYPE = "VisitSchemaKind.SCALAR_TYPE",
    ENUM_TYPE = "VisitSchemaKind.ENUM_TYPE",
    COMPOSITE_TYPE = "VisitSchemaKind.COMPOSITE_TYPE",
    OBJECT_TYPE = "VisitSchemaKind.OBJECT_TYPE",
    INPUT_OBJECT_TYPE = "VisitSchemaKind.INPUT_OBJECT_TYPE",
    ABSTRACT_TYPE = "VisitSchemaKind.ABSTRACT_TYPE",
    UNION_TYPE = "VisitSchemaKind.UNION_TYPE",
    INTERFACE_TYPE = "VisitSchemaKind.INTERFACE_TYPE",
    ROOT_OBJECT = "VisitSchemaKind.ROOT_OBJECT",
    QUERY = "VisitSchemaKind.QUERY",
    MUTATION = "VisitSchemaKind.MUTATION",
    SUBSCRIPTION = "VisitSchemaKind.SUBSCRIPTION"
}
export interface SchemaVisitorMap {
    [VisitSchemaKind.TYPE]?: NamedTypeVisitor;
    [VisitSchemaKind.SCALAR_TYPE]?: ScalarTypeVisitor;
    [VisitSchemaKind.ENUM_TYPE]?: EnumTypeVisitor;
    [VisitSchemaKind.COMPOSITE_TYPE]?: CompositeTypeVisitor;
    [VisitSchemaKind.OBJECT_TYPE]?: ObjectTypeVisitor;
    [VisitSchemaKind.INPUT_OBJECT_TYPE]?: InputObjectTypeVisitor;
    [VisitSchemaKind.ABSTRACT_TYPE]?: AbstractTypeVisitor;
    [VisitSchemaKind.UNION_TYPE]?: UnionTypeVisitor;
    [VisitSchemaKind.INTERFACE_TYPE]?: InterfaceTypeVisitor;
    [VisitSchemaKind.ROOT_OBJECT]?: ObjectTypeVisitor;
    [VisitSchemaKind.QUERY]?: ObjectTypeVisitor;
    [VisitSchemaKind.MUTATION]?: ObjectTypeVisitor;
    [VisitSchemaKind.SUBSCRIPTION]?: ObjectTypeVisitor;
}
export declare type NamedTypeVisitor = (type: GraphQLNamedType, schema: GraphQLSchema) => GraphQLNamedType | null | undefined;
export declare type ScalarTypeVisitor = (type: GraphQLScalarType, schema: GraphQLSchema) => GraphQLScalarType | null | undefined;
export declare type EnumTypeVisitor = (type: GraphQLEnumType, schema: GraphQLSchema) => GraphQLEnumType | null | undefined;
export declare type CompositeTypeVisitor = (type: GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType, schema: GraphQLSchema) => GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType | null | undefined;
export declare type ObjectTypeVisitor = (type: GraphQLObjectType, schema: GraphQLSchema) => GraphQLObjectType | null | undefined;
export declare type InputObjectTypeVisitor = (type: GraphQLInputObjectType, schema: GraphQLSchema) => GraphQLInputObjectType | null | undefined;
export declare type AbstractTypeVisitor = (type: GraphQLInterfaceType | GraphQLUnionType, schema: GraphQLSchema) => GraphQLInterfaceType | GraphQLUnionType | null | undefined;
export declare type UnionTypeVisitor = (type: GraphQLUnionType, schema: GraphQLSchema) => GraphQLUnionType | null | undefined;
export declare type InterfaceTypeVisitor = (type: GraphQLInterfaceType, schema: GraphQLSchema) => GraphQLInterfaceType | null | undefined;
export declare enum MapperKind {
    TYPE = "MapperKind.TYPE",
    SCALAR_TYPE = "MapperKind.SCALAR_TYPE",
    ENUM_TYPE = "MapperKind.ENUM_TYPE",
    COMPOSITE_TYPE = "MapperKind.COMPOSITE_TYPE",
    OBJECT_TYPE = "MapperKind.OBJECT_TYPE",
    INPUT_OBJECT_TYPE = "MapperKind.INPUT_OBJECT_TYPE",
    ABSTRACT_TYPE = "MapperKind.ABSTRACT_TYPE",
    UNION_TYPE = "MapperKind.UNION_TYPE",
    INTERFACE_TYPE = "MapperKind.INTERFACE_TYPE",
    ROOT_OBJECT = "MapperKind.ROOT_OBJECT",
    QUERY = "MapperKind.QUERY",
    MUTATION = "MapperKind.MUTATION",
    SUBSCRIPTION = "MapperKind.SUBSCRIPTION",
    DIRECTIVE = "MapperKind.DIRECTIVE"
}
export interface SchemaMapper {
    [MapperKind.TYPE]?: NamedTypeMapper;
    [MapperKind.SCALAR_TYPE]?: ScalarTypeMapper;
    [MapperKind.ENUM_TYPE]?: EnumTypeMapper;
    [MapperKind.COMPOSITE_TYPE]?: CompositeTypeMapper;
    [MapperKind.OBJECT_TYPE]?: ObjectTypeMapper;
    [MapperKind.INPUT_OBJECT_TYPE]?: InputObjectTypeMapper;
    [MapperKind.ABSTRACT_TYPE]?: AbstractTypeMapper;
    [MapperKind.UNION_TYPE]?: UnionTypeMapper;
    [MapperKind.INTERFACE_TYPE]?: InterfaceTypeMapper;
    [MapperKind.ROOT_OBJECT]?: ObjectTypeMapper;
    [MapperKind.QUERY]?: ObjectTypeMapper;
    [MapperKind.MUTATION]?: ObjectTypeMapper;
    [MapperKind.SUBSCRIPTION]?: ObjectTypeMapper;
    [MapperKind.DIRECTIVE]?: DirectiveMapper;
}
export declare type NamedTypeMapper = (type: GraphQLNamedType, schema: GraphQLSchema) => GraphQLNamedType | null | undefined;
export declare type ScalarTypeMapper = (type: GraphQLScalarType, schema: GraphQLSchema) => GraphQLScalarType | null | undefined;
export declare type EnumTypeMapper = (type: GraphQLEnumType, schema: GraphQLSchema) => GraphQLEnumType | null | undefined;
export declare type CompositeTypeMapper = (type: GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType, schema: GraphQLSchema) => GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType | null | undefined;
export declare type ObjectTypeMapper = (type: GraphQLObjectType, schema: GraphQLSchema) => GraphQLObjectType | null | undefined;
export declare type InputObjectTypeMapper = (type: GraphQLInputObjectType, schema: GraphQLSchema) => GraphQLInputObjectType | null | undefined;
export declare type AbstractTypeMapper = (type: GraphQLInterfaceType | GraphQLUnionType, schema: GraphQLSchema) => GraphQLInterfaceType | GraphQLUnionType | null | undefined;
export declare type UnionTypeMapper = (type: GraphQLUnionType, schema: GraphQLSchema) => GraphQLUnionType | null | undefined;
export declare type InterfaceTypeMapper = (type: GraphQLInterfaceType, schema: GraphQLSchema) => GraphQLInterfaceType | null | undefined;
export declare type DirectiveMapper = (directive: GraphQLDirective, schema: GraphQLSchema) => GraphQLDirective | null | undefined;
export declare type CreateProxyingResolverFn = (schema: GraphQLSchema | SubschemaConfig, transforms: Array<Transform>, operation: Operation, fieldName: string) => GraphQLFieldResolver<any, any>;
