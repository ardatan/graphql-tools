import { GraphQLSchema } from 'graphql';
import { ITypeDefinitions, GraphQLParseOptions } from '../Interfaces';
declare function buildSchemaFromTypeDefinitions(typeDefinitions: ITypeDefinitions, parseOptions?: GraphQLParseOptions): GraphQLSchema;
export default buildSchemaFromTypeDefinitions;
