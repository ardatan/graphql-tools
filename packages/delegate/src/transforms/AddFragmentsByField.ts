import {
  DocumentNode,
  GraphQLSchema,
  GraphQLType,
  Kind,
  SelectionSetNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  InlineFragmentNode,
} from 'graphql';

import { Transform, Request } from '@graphql-tools/utils';

export default class AddFragmentsByField implements Transform {
  private readonly targetSchema: GraphQLSchema;
  private readonly mapping: Record<string, Record<string, InlineFragmentNode>>;

  constructor(targetSchema: GraphQLSchema, mapping: Record<string, Record<string, InlineFragmentNode>>) {
    this.targetSchema = targetSchema;
    this.mapping = mapping;
  }

  public transformRequest(originalRequest: Request): Request {
    const document = addFragmentsByField(this.targetSchema, originalRequest.document, this.mapping);
    return {
      ...originalRequest,
      document,
    };
  }
}

function addFragmentsByField(
  targetSchema: GraphQLSchema,
  document: DocumentNode,
  mapping: Record<string, Record<string, InlineFragmentNode>>
): DocumentNode {
  const typeInfo = new TypeInfo(targetSchema);
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
                const fragment = mapping[parentTypeName][name];
                if (fragment != null) {
                  selections = selections.concat(fragment);
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
