import { GraphQLSchema, GraphQLFieldMap, GraphQLArgument, GraphQLFieldConfigArgumentMap, GraphQLObjectType, GraphQLObjectTypeConfig, GraphQLFieldConfigMap, GraphQLInputFieldConfigMap, GraphQLInterfaceType, GraphQLInterfaceTypeConfig, GraphQLUnionType, GraphQLUnionTypeConfig, GraphQLEnumType, GraphQLEnumTypeConfig, GraphQLScalarType, GraphQLScalarTypeConfig, GraphQLInputObjectType, GraphQLInputObjectTypeConfig, GraphQLDirective, GraphQLDirectiveConfig, GraphQLSchemaConfig, GraphQLField, GraphQLInputField, GraphQLInputFieldConfig, GraphQLInputFieldMap, GraphQLArgumentConfig, GraphQLFieldConfig } from 'graphql';
export declare function schemaToConfig(schema: GraphQLSchema): GraphQLSchemaConfig;
export declare function toConfig(graphqlObject: GraphQLSchema): GraphQLSchemaConfig;
export declare function toConfig(graphqlObject: GraphQLObjectTypeConfig<any, any> & {
    interfaces: Array<GraphQLInterfaceType>;
    fields: GraphQLFieldConfigMap<any, any>;
}): GraphQLObjectTypeConfig<any, any>;
export declare function toConfig(graphqlObject: GraphQLInterfaceType & {
    interfaces: Array<GraphQLInterfaceType>;
    fields: GraphQLFieldConfigMap<any, any>;
}): GraphQLInterfaceTypeConfig<any, any>;
export declare function toConfig(graphqlObject: GraphQLUnionType): GraphQLUnionTypeConfig<any, any> & {
    types: Array<GraphQLObjectType>;
};
export declare function toConfig(graphqlObject: GraphQLEnumType): GraphQLEnumTypeConfig;
export declare function toConfig(graphqlObject: GraphQLScalarType): GraphQLScalarTypeConfig<any, any>;
export declare function toConfig(graphqlObject: GraphQLInputObjectType): GraphQLInputObjectTypeConfig & {
    fields: GraphQLInputFieldConfigMap;
};
export declare function toConfig(graphqlObject: GraphQLDirective): GraphQLDirectiveConfig;
export declare function toConfig(graphqlObject: GraphQLInputField): GraphQLInputFieldConfig;
export declare function toConfig(graphqlObject: GraphQLField<any, any>): GraphQLFieldConfig<any, any>;
export declare function toConfig(graphqlObject: any): any;
export declare function typeToConfig(type: GraphQLObjectType): GraphQLObjectTypeConfig<any, any>;
export declare function typeToConfig(type: GraphQLInterfaceType): GraphQLInterfaceTypeConfig<any, any>;
export declare function typeToConfig(type: GraphQLUnionType): GraphQLUnionTypeConfig<any, any>;
export declare function typeToConfig(type: GraphQLEnumType): GraphQLEnumTypeConfig;
export declare function typeToConfig(type: GraphQLScalarType): GraphQLScalarTypeConfig<any, any>;
export declare function typeToConfig(type: GraphQLInputObjectType): GraphQLInputObjectTypeConfig;
export declare function typeToConfig(type: any): any;
export declare function objectTypeToConfig(type: GraphQLObjectType): GraphQLObjectTypeConfig<any, any>;
export declare function interfaceTypeToConfig(type: GraphQLInterfaceType): GraphQLInterfaceTypeConfig<any, any>;
export declare function unionTypeToConfig(type: GraphQLUnionType): GraphQLUnionTypeConfig<any, any>;
export declare function enumTypeToConfig(type: GraphQLEnumType): GraphQLEnumTypeConfig;
export declare function scalarTypeToConfig(type: GraphQLScalarType): GraphQLScalarTypeConfig<any, any>;
export declare function inputObjectTypeToConfig(type: GraphQLInputObjectType): GraphQLInputObjectTypeConfig;
export declare function inputFieldMapToConfig(fields: GraphQLInputFieldMap): GraphQLInputFieldConfigMap;
export declare function inputFieldToConfig(field: GraphQLInputField): GraphQLInputFieldConfig;
export declare function directiveToConfig(directive: GraphQLDirective): GraphQLDirectiveConfig;
export declare function fieldMapToConfig(fields: GraphQLFieldMap<any, any>): GraphQLFieldConfigMap<any, any>;
export declare function fieldToConfig(field: GraphQLField<any, any>): GraphQLFieldConfig<any, any>;
export declare function argumentMapToConfig(args: ReadonlyArray<GraphQLArgument>): GraphQLFieldConfigArgumentMap;
export declare function argumentToConfig(arg: GraphQLArgument): GraphQLArgumentConfig;
