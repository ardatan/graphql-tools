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

import { Transform, Request } from '@graphql-tools/utils';
import { MergedTypeInfo } from '../types';

export default class AddMergedTypeFragments implements Transform {
  private readonly targetSchema: GraphQLSchema;
  private readonly mapping: Record<string, MergedTypeInfo>;

  constructor(targetSchema: GraphQLSchema, mapping: Record<string, MergedTypeInfo>) {
    this.targetSchema = targetSchema;
    this.mapping = mapping;
  }

  public transformRequest(originalRequest: Request): Request {
    const document = addMergedTypeSelectionSets(this.targetSchema, originalRequest.document, this.mapping);
    return {
      ...originalRequest,
      document,
    };
  }
}

function addMergedTypeSelectionSets(
  targetSchema: GraphQLSchema,
  document: DocumentNode,
  mapping: Record<string, MergedTypeInfo>
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
            const selectionSet = mapping[parentTypeName].selectionSet;
            if (selectionSet != null) {
              selections = selections.concat(selectionSet.selections);
            }
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
