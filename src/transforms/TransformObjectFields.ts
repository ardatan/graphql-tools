import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLNamedType,
  GraphQLField,
  GraphQLFieldConfig,
  GraphQLType,
  DocumentNode,
  FieldNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  Kind
} from 'graphql';
import isEmptyObject from '../isEmptyObject';
import { Request } from '../Interfaces';
import { Transform } from './transforms';
import { visitSchema, VisitSchemaKind } from './visitSchema';
import { createResolveType, fieldToFieldConfig } from '../stitching/schemaRecreation';

export type ObjectFieldTransformer = (
  typeName: string,
  fieldName: string,
  field: GraphQLField<any, any>
) => GraphQLFieldConfig<any, any> | { name: string; field: GraphQLFieldConfig<any, any> } | null | undefined;

export type FieldNodeTransformer = (
  typeName: string,
  fieldName: string,
  fieldNode: FieldNode
) => FieldNode;

type FieldMapping = {
  [typeName: string]: {
    [newFieldName: string]: string;
  };
};

export default class TransformObjectFields implements Transform {
  private objectFieldTransformer: ObjectFieldTransformer;
  private fieldNodeTransformer: FieldNodeTransformer;
  private schema: GraphQLSchema;
  private mapping: FieldMapping;

  constructor(objectFieldTransformer: ObjectFieldTransformer, fieldNodeTransformer?: FieldNodeTransformer) {
    this.objectFieldTransformer = objectFieldTransformer;
    this.fieldNodeTransformer = fieldNodeTransformer;
    this.mapping = {};
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    this.schema = originalSchema;
    return visitSchema(originalSchema, {
      [VisitSchemaKind.ROOT_OBJECT]: () => {
        return undefined;
      },
      [VisitSchemaKind.OBJECT_TYPE]: (type: GraphQLObjectType) => {
        return this.transformFields(type, this.objectFieldTransformer);
      }
    });
  }

  public transformRequest(originalRequest: Request): Request {
    const document = this.reverseMapping(originalRequest.document, this.mapping, this.fieldNodeTransformer);
    return {
      ...originalRequest,
      document
    };
  }

  private transformFields(
    type: GraphQLObjectType,
    objectFieldTransformer: ObjectFieldTransformer
  ): GraphQLObjectType {
    const resolveType = createResolveType(
      (name: string, originalType: GraphQLNamedType): GraphQLNamedType => originalType
    );
    const fields = type.getFields();
    const newFields = {};

    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      const transformedField = objectFieldTransformer(type.name, fieldName, field);

      if (typeof transformedField === 'undefined') {
        newFields[fieldName] = fieldToFieldConfig(field, resolveType, true);
      } else if (transformedField !== null) {
        const newName = (transformedField as { name: string; field: GraphQLFieldConfig<any, any> }).name;

        if (newName) {
          newFields[newName] = (transformedField as {
            name: string;
            field: GraphQLFieldConfig<any, any>;
          }).field;
          if (newName !== fieldName) {
            const typeName = type.name;
            if (!this.mapping[typeName]) {
              this.mapping[typeName] = {};
            }
            this.mapping[typeName][newName] = fieldName;

            const originalResolver = (transformedField as {
              name: string;
              field: GraphQLFieldConfig<any, any>;
            }).field.resolve;
            (newFields[newName] as GraphQLFieldConfig<any, any>).resolve = (parent, args, context, info) =>
              originalResolver(parent, args, context, {
                ...info,
                fieldName
              });
          }
        } else {
          newFields[fieldName] = transformedField;
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
        isTypeOf: type.isTypeOf,
        fields: newFields,
        interfaces: () => type.getInterfaces().map(iface => resolveType(iface))
      });
    }
  }

  private reverseMapping(
    document: DocumentNode,
    mapping: FieldMapping,
    fieldNodeTransformer?: FieldNodeTransformer
  ): DocumentNode {
    const typeInfo = new TypeInfo(this.schema);
    const newDocument: DocumentNode = visit(
      document,
      visitWithTypeInfo(typeInfo, {
        [Kind.FIELD](node: FieldNode): FieldNode | null | undefined {
          const parentType: GraphQLType = typeInfo.getParentType();
          if (parentType) {
            const parentTypeName = parentType.name;
            const newName = node.name.value;
            const transformedNode = fieldNodeTransformer
              ? fieldNodeTransformer(parentTypeName, newName, node)
              : node;
            let transformedName = transformedNode.name.value;
            if (mapping[parentTypeName]) {
              const originalName = mapping[parentTypeName][newName];
              if (originalName) {
                transformedName = originalName;
              }
            }
            return {
              ...transformedNode,
              name: {
                ...node.name,
                value: transformedName
              }
            };
          }
        }
      })
    );
    return newDocument;
  }
}
