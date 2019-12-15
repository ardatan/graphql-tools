import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLField,
  GraphQLFieldConfig,
} from 'graphql';
import isEmptyObject from '../utils/isEmptyObject';
import { Transform } from './transforms';
import { visitSchema } from '../utils/visitSchema';
import { VisitSchemaKind } from '../Interfaces';

export type RootTransformer = (
  operation: 'Query' | 'Mutation' | 'Subscription',
  fieldName: string,
  field: GraphQLField<any, any>,
) =>
  | GraphQLFieldConfig<any, any>
  | RenamedField
  | null
  | undefined;

type RenamedField = { name: string; field?: GraphQLFieldConfig<any, any> };

export default class TransformRootFields implements Transform {
  private transform: RootTransformer;

  constructor(transform: RootTransformer) {
    this.transform = transform;
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return visitSchema(originalSchema, {
      [VisitSchemaKind.QUERY]: (type: GraphQLObjectType) => {
        return transformFields(
          type,
          (fieldName: string, field: GraphQLField<any, any>) =>
            this.transform('Query', fieldName, field),
        );
      },
      [VisitSchemaKind.MUTATION]: (type: GraphQLObjectType) => {
        return transformFields(
          type,
          (fieldName: string, field: GraphQLField<any, any>) =>
            this.transform('Mutation', fieldName, field),
        );
      },
      [VisitSchemaKind.SUBSCRIPTION]: (type: GraphQLObjectType) => {
        return transformFields(
          type,
          (fieldName: string, field: GraphQLField<any, any>) =>
            this.transform('Subscription', fieldName, field),
        );
      },
    });
  }
}

function transformFields(
  type: GraphQLObjectType,
  transformer: (
    fieldName: string,
    field: GraphQLField<any, any>,
  ) =>
    | GraphQLFieldConfig<any, any>
    | RenamedField
    | null
    | undefined,
): GraphQLObjectType {
  const typeConfig = type.toConfig();
  const fields = type.getFields();
  const newFields = {};
  Object.keys(fields).forEach(fieldName => {
    const field = fields[fieldName];
    const newField = transformer(fieldName, field);
    if (typeof newField === 'undefined') {
      newFields[fieldName] = typeConfig.fields[fieldName];
    } else if (newField !== null) {
      if ((newField as RenamedField).name) {
        newFields[(newField as RenamedField).name] =
          (newField as RenamedField).field ?
            (newField as RenamedField).field :
            typeConfig.fields[fieldName];
      } else {
        newFields[fieldName] = newField;
      }
    }
  });
  if (isEmptyObject(newFields)) {
    return null;
  } else {
    return new GraphQLObjectType({
      ...type,
      fields: newFields,
    });
  }
}
