import { GraphQLSchema, SelectionSetNode, TypeInfo, GraphQLOutputType, Kind } from 'graphql';

import { Transform, Request } from '@graphql-tools/utils';
import VisitSelectionSets from './VisitSelectionSets';

export default class AddSelectionSetsByField implements Transform {
  private readonly transformer: VisitSelectionSets;

  constructor(
    sourceSchema: GraphQLSchema,
    initialType: GraphQLOutputType,
    selectionSetsByType: Record<string, SelectionSetNode>,
    selectionSetsByField: Record<string, Record<string, SelectionSetNode>>
  ) {
    this.transformer = new VisitSelectionSets(sourceSchema, initialType, (node, typeInfo) =>
      visitSelectionSet(node, typeInfo, selectionSetsByType, selectionSetsByField)
    );
  }

  public transformRequest(originalRequest: Request): Request {
    return this.transformer.transformRequest(originalRequest);
  }
}

function visitSelectionSet(
  node: SelectionSetNode,
  typeInfo: TypeInfo,
  selectionSetsByType: Record<string, SelectionSetNode>,
  selectionSetsByField: Record<string, Record<string, SelectionSetNode>>
): SelectionSetNode {
  const parentType = typeInfo.getParentType();
  if (parentType != null) {
    const parentTypeName = parentType.name;
    let selections = node.selections;

    if (parentTypeName in selectionSetsByType) {
      const selectionSet = selectionSetsByType[parentTypeName];
      if (selectionSet != null) {
        selections = selections.concat(selectionSet.selections);
      }
    }

    if (parentTypeName in selectionSetsByField) {
      node.selections.forEach(selection => {
        if (selection.kind === Kind.FIELD) {
          const name = selection.name.value;
          const selectionSet = selectionSetsByField[parentTypeName][name];
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
}
