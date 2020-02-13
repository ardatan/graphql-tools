import { Request } from '../Interfaces';

import { Transform } from './transforms';

import {
  GraphQLSchema,
  GraphQLType,
  DocumentNode,
  FieldNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  Kind,
  SelectionNode,
  FragmentDefinitionNode
} from 'graphql';

export type FieldNodeTransformer = (
  fieldNode: FieldNode,
  fragments: Record<string, FragmentDefinitionNode>
) => SelectionNode | Array<SelectionNode>;

export type FieldNodeTransformerMap = {
  [typeName: string]: {
    [fieldName: string]: FieldNodeTransformer
  }
};

export default class MapFields implements Transform {
  private schema: GraphQLSchema | undefined;
  private readonly fieldNodeTransformerMap: FieldNodeTransformerMap;

  constructor(
    fieldNodeTransformerMap: FieldNodeTransformerMap,
  ) {
    this.fieldNodeTransformerMap = fieldNodeTransformerMap;
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    this.schema = schema;
    return schema;
  }

  public transformRequest(originalRequest: Request): Request {
    if (!this.schema) {
      throw new Error('MapFields transform required initialization with target schema within the transformSchema method.')
    }

    const fragments = {};
    originalRequest.document.definitions.filter(
      def => def.kind === Kind.FRAGMENT_DEFINITION
    ).forEach(def => {
      fragments[(def as FragmentDefinitionNode).name.value] = def;
    });
    const document = transformDocument(
      originalRequest.document,
      this.schema,
      this.fieldNodeTransformerMap,
      fragments
    );
    return {
      ...originalRequest,
      document
    };
  }
}

function transformDocument(
  document: DocumentNode,
  schema: GraphQLSchema,
  fieldNodeTransformerMap: FieldNodeTransformerMap,
  fragments: Record<string, FragmentDefinitionNode> = {},
): DocumentNode {
  const typeInfo = new TypeInfo(schema);
  const newDocument: DocumentNode = visit(
    document,
    visitWithTypeInfo(typeInfo, {
      [Kind.SELECTION_SET]: node => {
        const parentType: GraphQLType | null | undefined = typeInfo.getParentType();
        if (parentType != null) {
          const parentTypeName = parentType.name;
          const fieldNodeTransformers = fieldNodeTransformerMap[parentTypeName];
          let newSelections: Array<SelectionNode> = [];

          node.selections.forEach(selection => {
            if (selection.kind === Kind.FIELD) {
              const fieldName = selection.name.value;

              let transformedSelection;
              if (fieldNodeTransformers != null) {
                const fieldNodeTransformer = fieldNodeTransformers[fieldName];
                if (fieldNodeTransformer != null) {
                  transformedSelection = fieldNodeTransformer(selection, fragments);
                } else {
                  transformedSelection = selection;
                }
              } else {
                transformedSelection = selection;
              }

              if (Array.isArray(transformedSelection)) {
                newSelections = newSelections.concat(transformedSelection);
              } else if (transformedSelection.kind === Kind.FIELD) {
                newSelections.push(transformedSelection);
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
