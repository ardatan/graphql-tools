import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLField,
  GraphQLFieldConfig,
  GraphQLType,
  DocumentNode,
  FieldNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  Kind,
  SelectionSetNode,
  SelectionNode,
  FragmentDefinitionNode
} from 'graphql';
import isEmptyObject from '../utils/isEmptyObject';
import { Request, VisitSchemaKind } from '../Interfaces';
import { Transform } from './transforms';
import { visitSchema } from '../utils/visitSchema';

export type ObjectFieldTransformer = (
  typeName: string,
  fieldName: string,
  field: GraphQLField<any, any>,
) => GraphQLFieldConfig<any, any> | RenamedField | null | undefined;

export type FieldNodeTransformer = (
  typeName: string,
  fieldName: string,
  fieldNode: FieldNode,
  fragments: Record<string, FragmentDefinitionNode>
) => SelectionNode | Array<SelectionNode>;

type FieldMapping = {
  [typeName: string]: {
    [newFieldName: string]: string;
  };
};

type RenamedField = { name: string; field?: GraphQLFieldConfig<any, any> };

export default class TransformObjectFields implements Transform {
  private objectFieldTransformer: ObjectFieldTransformer;
  private fieldNodeTransformer: FieldNodeTransformer;
  private transformedSchema: GraphQLSchema;
  private mapping: FieldMapping;

  constructor(
    objectFieldTransformer: ObjectFieldTransformer,
    fieldNodeTransformer?: FieldNodeTransformer,
  ) {
    this.objectFieldTransformer = objectFieldTransformer;
    this.fieldNodeTransformer = fieldNodeTransformer;
    this.mapping = {};
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    this.transformedSchema = visitSchema(originalSchema, {
      [VisitSchemaKind.ROOT_OBJECT]: () => {
        return undefined;
      },
      [VisitSchemaKind.OBJECT_TYPE]: (type: GraphQLObjectType) => {
        return this.transformFields(type, this.objectFieldTransformer);
      }
    });

    return this.transformedSchema;
  }

  public transformRequest(originalRequest: Request): Request {
    const fragments = {};
    originalRequest.document.definitions.filter(
      def => def.kind === Kind.FRAGMENT_DEFINITION
    ).forEach(def => {
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
      document
    };
  }

  private transformFields(
    type: GraphQLObjectType,
    objectFieldTransformer: ObjectFieldTransformer
  ): GraphQLObjectType {
    const typeConfig = type.toConfig();
    const fields = type.getFields();
    const newFields = {};

    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      const transformedField = objectFieldTransformer(type.name, fieldName, field);

      if (typeof transformedField === 'undefined') {
        newFields[fieldName] = typeConfig.fields[fieldName];
      } else if (transformedField !== null) {
        const newName = (transformedField as RenamedField).name;

        if (newName) {
          newFields[newName] = (transformedField as RenamedField).field ?
            (transformedField as RenamedField).field :
            typeConfig.fields[fieldName];

          if (newName !== fieldName) {
            const typeName = type.name;
            if (!this.mapping[typeName]) {
              this.mapping[typeName] = {};
            }
            this.mapping[typeName][newName] = fieldName;
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
        ...type.toConfig(),
        fields: newFields,
      });
    }
  }

  private transformDocument(
    document: DocumentNode,
    mapping: FieldMapping,
    fieldNodeTransformer?: FieldNodeTransformer,
    fragments: Record<string, FragmentDefinitionNode> = {},
  ): DocumentNode {
    const typeInfo = new TypeInfo(this.transformedSchema);
    const newDocument: DocumentNode = visit(
      document,
      visitWithTypeInfo(typeInfo, {
        [Kind.SELECTION_SET](node: SelectionSetNode): SelectionSetNode {
          const parentType: GraphQLType = typeInfo.getParentType();
          if (parentType) {
            const parentTypeName = parentType.name;
            let newSelections: Array<SelectionNode> = [];

            node.selections.forEach(selection => {
              if (selection.kind === Kind.FIELD) {
                const newName = selection.name.value;

                const transformedSelection = fieldNodeTransformer
                  ? fieldNodeTransformer(parentTypeName, newName, selection, fragments)
                  : selection;

                if (Array.isArray(transformedSelection)) {
                  newSelections = newSelections.concat(transformedSelection);
                } else if (transformedSelection.kind === Kind.FIELD) {
                  const oldName = mapping[parentTypeName] && mapping[parentTypeName][newName];
                  if (oldName) {
                    newSelections.push({
                      ...transformedSelection,
                      name: {
                        kind: Kind.NAME,
                        value: oldName
                      },
                      alias: {
                        kind: Kind.NAME,
                        value: newName
                      }
                    });
                  } else {
                    newSelections.push(transformedSelection);
                  }
                } else {
                  newSelections.push(transformedSelection);
                }
              } else {
                newSelections.push(selection);
              }
            });

            return {
              ...node,
              selections: newSelections,
            };
          }
        }
      })
    );
    return newDocument;
  }
}
