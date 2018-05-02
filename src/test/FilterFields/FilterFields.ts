import {
  GraphQLSchema,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLField,
  GraphQLFieldConfig,
} from 'graphql';
import {Transform} from '../..';
import {visitSchema, VisitSchemaKind} from '../../transforms/visitSchema';
import {
  createResolveType,
  fieldToFieldConfig,
} from '../../stitching/schemaRecreation';
import isEmptyObject from '../../isEmptyObject';

// The bulk of the code in this Transformer is from
// graphql-tools/src/transforms/TransformRootFields.ts

export interface FieldsToFilter {
  [type: string]: string[];
}

export default class FilterFields implements Transform {
  private fieldsToFilter: FieldsToFilter;

  constructor(fieldsToFilter: FieldsToFilter = {}) {
    this.fieldsToFilter = fieldsToFilter;
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    return visitSchema(schema, {
      [VisitSchemaKind.OBJECT_TYPE]: type => {
        if (
          type instanceof GraphQLObjectType &&
          this.fieldsToFilter[type.name]
        ) {
          return transformFields(
            type,
            (fieldName, field) =>
              this.fieldsToFilter[type.name].includes(fieldName)
                ? null
                : undefined,
          ) as GraphQLNamedType;
        }

        return (undefined as any) as GraphQLNamedType;
      },
    });
  }
}

interface NewField {
  name: string;
  field: GraphQLFieldConfig<any, any>;
}

function transformFields(
  type: GraphQLObjectType,
  transformer: (
    fieldName: string,
    field: GraphQLField<any, any>,
  ) =>
    | GraphQLFieldConfig<any, any>
    | {name: string; field: GraphQLFieldConfig<any, any>}
    | null
    | undefined,
): GraphQLObjectType | null {
  const resolveType = createResolveType((name, originalType) => originalType);
  const fields = type.getFields();
  const newFields: {[k: string]: any} = {};
  Object.keys(fields).forEach(fieldName => {
    const field = fields[fieldName];
    const newField = transformer(fieldName, field);
    if (typeof newField === 'undefined') {
      newFields[fieldName] = fieldToFieldConfig(field, resolveType, true);
    } else if (newField !== null) {
      if ((newField as NewField).name) {
        newFields[(newField as NewField).name] = (newField as NewField).field;
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
      fields: newFields,
      // This line can be commented out to fix this issue,
      // at the cost of stripping all directives.
      astNode: type.astNode,
    });
  }
}
