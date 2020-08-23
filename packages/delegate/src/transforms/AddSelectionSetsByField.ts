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

export default class AddSelectionSetsByField implements Transform {
  private readonly schema: GraphQLSchema;
  private readonly mapping: Record<string, Record<string, SelectionSetNode>>;

  constructor(schema: GraphQLSchema, mapping: Record<string, Record<string, SelectionSetNode>>) {
    this.schema = schema;
    this.mapping = mapping;
  }

  public transformRequest(
    originalRequest: Request,
    _delegationContext: DelegationContext,
    _transformationContext: Record<string, any>
  ): Request {
    const document = addSelectionSetsByField(this.schema, originalRequest.document, this.mapping);
    return {
      ...originalRequest,
      document,
    };
  }
}

function addSelectionSetsByField(
  schema: GraphQLSchema,
  document: DocumentNode,
  mapping: Record<string, Record<string, SelectionSetNode>>
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
