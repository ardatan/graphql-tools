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

import { Request } from '@graphql-tools/utils';

import { Transform, DelegationContext } from '../types';

export default class AddSelectionSetsByType implements Transform {
  private readonly targetSchema: GraphQLSchema;
  private readonly mapping: Record<string, SelectionSetNode>;

  constructor(targetSchema: GraphQLSchema, mapping: Record<string, SelectionSetNode>) {
    this.targetSchema = targetSchema;
    this.mapping = mapping;
  }

  public transformRequest(
    originalRequest: Request,
    _delegationContext: DelegationContext,
    _transformationContext: Record<string, any>
  ): Request {
    const document = addSelectionSetsByType(this.targetSchema, originalRequest.document, this.mapping);
    return {
      ...originalRequest,
      document,
    };
  }
}

function addSelectionSetsByType(
  targetSchema: GraphQLSchema,
  document: DocumentNode,
  mapping: Record<string, SelectionSetNode>
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
            const selectionSet = mapping[parentTypeName];
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
