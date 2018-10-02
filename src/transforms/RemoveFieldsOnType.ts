import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLNamedType,
} from 'graphql';
import { Transform } from './transforms';
import { visitSchema, VisitSchemaKind } from './visitSchema';
import { fieldToFieldConfig, createResolveType } from '../stitching/schemaRecreation';

export default class RemoveFieldsOnType implements Transform {
  private typeName: string;
  private fields: Array<string>;

  constructor(typeName: string, fields: Array<string> ) {
    this.typeName = typeName;
    this.fields = fields;
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return visitSchema(originalSchema, {
      [VisitSchemaKind.OBJECT_TYPE]: (type: GraphQLObjectType) => {
        // If it's not the object you're looking for, just skip it
        if (type.name !== this.typeName) {
          return type;
        }
        // It's the class you're after, so re-create the type
        // and remove the fields that you want to remove
        const resolveType = createResolveType(
          (name: string, originalType: GraphQLNamedType): GraphQLNamedType =>
            originalType,
        );
        const newFields = {};
        const oldFields = type.getFields();
        Object.keys(oldFields).forEach(fieldName => {
          if (!this.fields.includes(fieldName)) {
            const field = oldFields[fieldName];
            newFields[fieldName] = fieldToFieldConfig(field, resolveType, true);
          }
        });
        return new GraphQLObjectType({
          name: type.name,
          description: type.description,
          astNode: type.astNode,
          // extensionASTNodes: type.extensionASTNodes,
          // interfaces: type.getInterfaces(),
          // isTypeOf: type.isTypeOf,
          fields: newFields
        });
      },
    });
  }
}
