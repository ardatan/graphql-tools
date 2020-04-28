import {
  DocumentNode,
  GraphQLSchema,
  GraphQLType,
  Kind,
  SelectionSetNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
} from 'graphql';

import { Transform, Request, ReplacementSelectionSetMapping } from '@graphql-tools/utils';

export default class AddReplacementSelectionSets implements Transform {
  private readonly schema: GraphQLSchema;
  private readonly mapping: ReplacementSelectionSetMapping;

  constructor(schema: GraphQLSchema, mapping: ReplacementSelectionSetMapping) {
    this.schema = schema;
    this.mapping = mapping;
  }

  public transformRequest(originalRequest: Request): Request {
    const document = replaceFieldsWithSelectionSet(this.schema, originalRequest.document, this.mapping);
    return {
      ...originalRequest,
      document,
    };
  }
}

function replaceFieldsWithSelectionSet(
  schema: GraphQLSchema,
  document: DocumentNode,
  mapping: ReplacementSelectionSetMapping
): DocumentNode {
  const typeInfo = new TypeInfo(schema);
  return visit(
    document,
    visitWithTypeInfo(typeInfo, {
      [Kind.SELECTION_SET](node: SelectionSetNode): SelectionSetNode | null | undefined {
        const parentType: GraphQLType | null | undefined = typeInfo.getParentType();
        if (parentType != null) {
          const parentTypeName = parentType.name;
          let selections = node.selections;

          if (parentTypeName in mapping) {
            node.selections.forEach(selection => {
              if (selection.kind === Kind.FIELD) {
                const name = selection.name.value;
                const selectionSet = mapping[parentTypeName][name];
                if (selectionSet != null) {
                  selections = selections.concat(selectionSet.selections);
                }
              }
            });
          }

          if (selections !== node.selections) {
            return {
              ...node,
              selections,
            };
          }
        }
      },
    })
  );
}
