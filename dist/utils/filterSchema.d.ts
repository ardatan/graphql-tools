import { GraphQLType } from 'graphql';
import { GraphQLSchemaWithTransforms, RootFieldFilter } from '../Interfaces';
export default function filterSchema({ schema, rootFieldFilter, typeFilter, fieldFilter, }: {
    schema: GraphQLSchemaWithTransforms;
    rootFieldFilter?: RootFieldFilter;
    typeFilter?: (typeName: string, type: GraphQLType) => boolean;
    fieldFilter?: (typeName: string, fieldName: string) => boolean;
}): GraphQLSchemaWithTransforms;
