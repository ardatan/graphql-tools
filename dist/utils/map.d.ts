import { GraphQLDirective, GraphQLNamedType, GraphQLSchema } from 'graphql';
import { SchemaMapper } from '../Interfaces';
export declare function mapSchema(schema: GraphQLSchema, schemaMapper?: SchemaMapper): GraphQLSchema;
export declare function rewireTypes(originalTypeMap: Record<string, GraphQLNamedType | null>, directives: ReadonlyArray<GraphQLDirective>): {
    typeMap: Record<string, GraphQLNamedType>;
    directives: Array<GraphQLDirective>;
};
