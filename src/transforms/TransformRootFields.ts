import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLNamedType,
  GraphQLField,
  GraphQLFieldConfig,
} from 'graphql';
import isEmptyObject from '../isEmptyObject';
import { Transform } from './transforms';
import { visitSchema, VisitSchemaKind } from './visitSchema';
import {
  createResolveType,
  fieldToFieldConfig,
} from '../stitching/schemaRecreation';

export type RootTransformer = (
  operation: 'Query' | 'Mutation' | 'Subscription',
  fieldName: string,
  field: GraphQLField<any, any>,
) =>
  | GraphQLFieldConfig<any, any>
  | { name: string; field: GraphQLFieldConfig<any, any> }
  | null
  | undefined;

export default function TransformRootFields(
  transform: RootTransformer,
): Transform {
  return {
    transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
      return visitSchema(originalSchema, {
        [VisitSchemaKind.QUERY](type: GraphQLObjectType) {
          return transformFields(
            type,
            (fieldName: string, field: GraphQLField<any, any>) =>
              transform('Query', fieldName, field),
          );
        },
        [VisitSchemaKind.MUTATION](type: GraphQLObjectType) {
          return transformFields(
            type,
            (fieldName: string, field: GraphQLField<any, any>) =>
              transform('Mutation', fieldName, field),
          );
        },
        [VisitSchemaKind.SUBSCRIPTION](type: GraphQLObjectType) {
          return transformFields(
            type,
            (fieldName: string, field: GraphQLField<any, any>) =>
              transform('Subscription', fieldName, field),
          );
        },
      });
    },
  };
}

function transformFields(
  type: GraphQLObjectType,
  transformer: (
    fieldName: string,
    field: GraphQLField<any, any>,
  ) =>
    | GraphQLFieldConfig<any, any>
    | { name: string; field: GraphQLFieldConfig<any, any> }
    | null
    | undefined,
): GraphQLObjectType {
  const resolveType = createResolveType(
    (name: string, originalType: GraphQLNamedType): GraphQLNamedType =>
      originalType,
  );
  const fields = type.getFields();
  const newFields = {};
  Object.keys(fields).forEach(fieldName => {
    const field = fields[fieldName];
    const newField = transformer(fieldName, field);
    if (typeof newField === 'undefined') {
      newFields[fieldName] = fieldToFieldConfig(field, resolveType, true);
    } else if (newField !== null) {
      if (
        (<{ name: string; field: GraphQLFieldConfig<any, any> }>newField).name
      ) {
        newFields[
          (<{ name: string; field: GraphQLFieldConfig<any, any> }>newField).name
        ] = (<{
          name: string;
          field: GraphQLFieldConfig<any, any>;
        }>newField).field;
      } else {
        newFields[fieldName] = newField;
      }
    }
  });
  if (isEmptyObject(newFields)) {
    return null;
  } else {
    return new GraphQLObjectType({
      name: type.name,
      description: type.description,
      astNode: type.astNode,
      fields: newFields,
    });
  }
}
