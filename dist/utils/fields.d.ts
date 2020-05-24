import { GraphQLFieldConfigMap, GraphQLFieldConfig } from 'graphql';
import { TypeMap } from '../Interfaces';
export declare function appendFields(typeMap: TypeMap, typeName: string, fields: GraphQLFieldConfigMap<any, any>): void;
export declare function removeFields(typeMap: TypeMap, typeName: string, testFn: (fieldName: string, field: GraphQLFieldConfig<any, any>) => boolean): GraphQLFieldConfigMap<any, any>;
