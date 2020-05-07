import {
  GraphQLSchema,
  GraphQLType,
  DocumentNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  Kind,
  SelectionSetNode,
  SelectionNode,
  FragmentDefinitionNode,
  GraphQLInterfaceType,
  isObjectType,
  isInterfaceType,
  GraphQLObjectType,
} from 'graphql';

import { Transform, Request, MapperKind, mapSchema } from '@graphql-tools/utils';
import { FieldTransformer, FieldNodeTransformer } from '../types';

export default class TransformCompositeFields implements Transform {
  private readonly fieldTransformer: FieldTransformer;
  private readonly fieldNodeTransformer: FieldNodeTransformer;
  private transformedSchema: GraphQLSchema;
  private mapping: Record<string, Record<string, string>>;

  constructor(fieldTransformer: FieldTransformer, fieldNodeTransformer?: FieldNodeTransformer) {
    this.fieldTransformer = fieldTransformer;
    this.fieldNodeTransformer = fieldNodeTransformer;
    this.mapping = {};
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    this.transformedSchema = mapSchema(originalSchema, {
      [MapperKind.OBJECT_TYPE]: (type: GraphQLObjectType) => this.transformFields(type, this.fieldTransformer),
      [MapperKind.INTERFACE_TYPE]: (type: GraphQLInterfaceType) => this.transformFields(type, this.fieldTransformer),
    });

    return this.transformedSchema;
  }

  public transformRequest(originalRequest: Request): Request {
    const fragments = Object.create(null);
    originalRequest.document.definitions
      .filter(def => def.kind === Kind.FRAGMENT_DEFINITION)
      .forEach(def => {
        fragments[(def as FragmentDefinitionNode).name.value] = def;
      });
    const document = this.transformDocument(
      originalRequest.document,
      this.mapping,
      this.fieldNodeTransformer,
      fragments
    );
    return {
      ...originalRequest,
      document,
    };
  }

  private transformFields(type: GraphQLObjectType, fieldTransformer: FieldTransformer): GraphQLObjectType;

  private transformFields(type: GraphQLInterfaceType, fieldTransformer: FieldTransformer): GraphQLInterfaceType;

  private transformFields(type: GraphQLObjectType | GraphQLInterfaceType, fieldTransformer: FieldTransformer): any {
    const config = type.toConfig();

    const originalFieldConfigMap = config.fields;
    const newFieldConfigMap = {};

    Object.keys(originalFieldConfigMap).forEach(fieldName => {
      const originalfieldConfig = originalFieldConfigMap[fieldName];
      const transformedField = fieldTransformer(type.name, fieldName, originalfieldConfig);

      if (transformedField === undefined) {
        newFieldConfigMap[fieldName] = originalfieldConfig;
      } else if (Array.isArray(transformedField)) {
        const newFieldName = transformedField[0];
        const newFieldConfig = transformedField[1];
        newFieldConfigMap[newFieldName] = newFieldConfig;

        if (newFieldName !== fieldName) {
          const typeName = type.name;
          if (!(typeName in this.mapping)) {
            this.mapping[typeName] = {};
          }
          this.mapping[typeName][newFieldName] = fieldName;
        }
      } else if (transformedField != null) {
        newFieldConfigMap[fieldName] = transformedField;
      }
    });

    if (!Object.keys(newFieldConfigMap).length) {
      return null;
    }

    if (isObjectType(type)) {
      return new GraphQLObjectType({
        ...type.toConfig(),
        fields: newFieldConfigMap,
      });
    } else if (isInterfaceType(type)) {
      return new GraphQLInterfaceType({
        ...type.toConfig(),
        fields: newFieldConfigMap,
      });
    }
  }

  private transformDocument(
    document: DocumentNode,
    mapping: Record<string, Record<string, string>>,
    fieldNodeTransformer?: FieldNodeTransformer,
    fragments: Record<string, FragmentDefinitionNode> = {}
  ): DocumentNode {
    const typeInfo = new TypeInfo(this.transformedSchema);
    const newDocument: DocumentNode = visit(
      document,
      visitWithTypeInfo(typeInfo, {
        leave: {
          [Kind.SELECTION_SET]: (node: SelectionSetNode): SelectionSetNode => {
            const parentType: GraphQLType = typeInfo.getParentType();
            if (parentType != null) {
              const parentTypeName = parentType.name;
              let newSelections: Array<SelectionNode> = [];

              node.selections.forEach(selection => {
                if (selection.kind !== Kind.FIELD) {
                  newSelections.push(selection);
                  return;
                }

                const newName = selection.name.value;

                const transformedSelection =
                  fieldNodeTransformer != null
                    ? fieldNodeTransformer(parentTypeName, newName, selection, fragments)
                    : selection;

                if (Array.isArray(transformedSelection)) {
                  newSelections = newSelections.concat(transformedSelection);
                  return;
                }

                if (transformedSelection.kind !== Kind.FIELD) {
                  newSelections.push(transformedSelection);
                  return;
                }

                const typeMapping = mapping[parentTypeName];
                if (typeMapping == null) {
                  newSelections.push(transformedSelection);
                  return;
                }

                const oldName = mapping[parentTypeName][newName];
                if (oldName == null) {
                  newSelections.push(transformedSelection);
                  return;
                }

                newSelections.push({
                  ...transformedSelection,
                  name: {
                    kind: Kind.NAME,
                    value: oldName,
                  },
                  alias: {
                    kind: Kind.NAME,
                    value: newName,
                  },
                });
              });

              return {
                ...node,
                selections: newSelections,
              };
            }
          },
        },
      })
    );
    return newDocument;
  }
}
