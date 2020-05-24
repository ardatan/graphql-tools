import { GraphQLSchema } from 'graphql';
import { IResolvers, IResolverValidationOptions, IAddResolversToSchemaOptions } from '../Interfaces';
declare function addResolversToSchema(schemaOrOptions: GraphQLSchema | IAddResolversToSchemaOptions, legacyInputResolvers?: IResolvers, legacyInputValidationOptions?: IResolverValidationOptions): GraphQLSchema;
export default addResolversToSchema;
