import { SelectionSetNode, TypeInfo, Kind, FieldNode, SelectionNode, print } from 'graphql';

import { Request } from '@graphql-tools/utils';

import { Transform, DelegationContext } from '../types';
import { memoize2 } from '../memoize';

import VisitSelectionSets from './VisitSelectionSets';

export default class AddFieldNodes implements Transform {
  private readonly transformer: VisitSelectionSets;

  constructor(
    fieldNodesByField: Record<string, Record<string, Array<FieldNode>>>,
    dynamicFieldNodesByField: Record<string, Record<string, Array<(node: FieldNode) => Array<FieldNode>>>>
  ) {
    this.transformer = new VisitSelectionSets((node, typeInfo) =>
      visitSelectionSet(node, typeInfo, fieldNodesByField, dynamicFieldNodesByField)
    );
  }

  public transformRequest(
    originalRequest: Request,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ): Request {
    return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
  }
}

function visitSelectionSet(
  node: SelectionSetNode,
  typeInfo: TypeInfo,
  fieldNodesByField: Record<string, Record<string, Array<FieldNode>>>,
  dynamicFieldNodesByField: Record<string, Record<string, Array<(node: FieldNode) => Array<FieldNode>>>>
): SelectionSetNode {
  const parentType = typeInfo.getParentType();

  const newSelections: Map<string, SelectionNode> = new Map();

  if (parentType != null) {
    const parentTypeName = parentType.name;
    addSelectionsToMap(newSelections, node.selections);

    if (parentTypeName in fieldNodesByField) {
      node.selections.forEach(selection => {
        if (selection.kind === Kind.FIELD) {
          const name = selection.name.value;
          const fieldNodes = fieldNodesByField[parentTypeName][name];
          if (fieldNodes != null) {
            addSelectionsToMap(newSelections, fieldNodes);
          }
        }
      });
    }

    if (parentTypeName in dynamicFieldNodesByField) {
      node.selections.forEach(selection => {
        if (selection.kind === Kind.FIELD) {
          const name = selection.name.value;
          const dynamicFieldNodes = dynamicFieldNodesByField[parentTypeName][name];
          if (dynamicFieldNodes != null) {
            dynamicFieldNodes.forEach(fieldNodeFn => {
              const fieldNodes = fieldNodeFn(selection);
              if (fieldNodes != null) {
                addSelectionsToMap(newSelections, fieldNodes);
              }
            });
          }
        }
      });
    }

    return {
      ...node,
      selections: Array.from(newSelections.values()),
    };
  }
}

const addSelectionsToMap = memoize2(function (map: Map<string, SelectionNode>, selections: ReadonlyArray<SelectionNode>): void {
  selections.forEach(selection => {
    map.set(print(selection), selection);
  });
});
