import { SelectionSetNode, TypeInfo, Kind, FieldNode, SelectionNode } from 'graphql';

import { Maybe, ExecutionRequest } from '@graphql-tools/utils';

import { Transform, DelegationContext } from '../types';

import VisitSelectionSets from './VisitSelectionSets';

export default class AddSelectionSets implements Transform {
  private readonly transformer: VisitSelectionSets;

  constructor(
    fieldNodesByType: Record<string, Array<FieldNode>>,
    fieldNodesByField: Record<string, Record<string, Array<FieldNode>>>,
    dynamicSelectionSetsByField: Record<string, Record<string, Array<(node: FieldNode) => SelectionSetNode>>>
  ) {
    this.transformer = new VisitSelectionSets((node, typeInfo) =>
      visitSelectionSet(node, typeInfo, fieldNodesByType, fieldNodesByField, dynamicSelectionSetsByField)
    );
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ): ExecutionRequest {
    return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
  }
}

function visitSelectionSet(
  node: SelectionSetNode,
  typeInfo: TypeInfo,
  fieldNodesByType: Record<string, Array<FieldNode>>,
  fieldNodesByField: Record<string, Record<string, Array<FieldNode>>>,
  dynamicSelectionSetsByField: Record<string, Record<string, Array<(node: FieldNode) => SelectionSetNode>>>
): Maybe<SelectionSetNode> {
  const parentType = typeInfo.getParentType();

  const newSelections: Set<SelectionNode> = new Set();

  if (parentType != null) {
    const parentTypeName = parentType.name;

    const fieldNodes = fieldNodesByType[parentTypeName];
    if (fieldNodes) {
      addSelectionsToSet(newSelections, fieldNodes);
    }

    if (parentTypeName in fieldNodesByField) {
      for (const selection of node.selections) {
        if (selection.kind === Kind.FIELD) {
          const fieldName = selection.name.value;
          const fieldNodes = fieldNodesByField[parentTypeName][fieldName];
          if (fieldNodes != null) {
            addSelectionsToSet(newSelections, fieldNodes);
          }
        }
      }
    }

    if (parentTypeName in dynamicSelectionSetsByField) {
      for (const selection of node.selections) {
        if (selection.kind === Kind.FIELD) {
          const name = selection.name.value;
          const dynamicSelectionSets = dynamicSelectionSetsByField[parentTypeName][name];
          if (dynamicSelectionSets != null) {
            for (const selectionSetFn of dynamicSelectionSets) {
              const selectionSet = selectionSetFn(selection);
              if (selectionSet != null) {
                addSelectionsToSet(newSelections, selectionSet.selections);
              }
            }
          }
        }
      }
    }

    return {
      ...node,
      selections: (node.selections ?? []).concat(Array.from(newSelections.values())),
    };
  }
}

function addSelectionsToSet(set: Set<SelectionNode>, selections: ReadonlyArray<SelectionNode>): void {
  for (const selection of selections) {
    set.add(selection);
  }
}
