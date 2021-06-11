import {
  DocumentNode,
  GraphQLSchema,
  Kind,
  SelectionSetNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  GraphQLOutputType,
  FragmentDefinitionNode,
  SelectionNode,
  DefinitionNode,
  InlineFragmentNode,
} from 'graphql';

import { Request } from '@graphql-tools/utils';

import { Transform, DelegationContext } from '../types';

export default class VisitSelectionSets implements Transform {
  private readonly visitor: (node: SelectionSetNode, typeInfo: TypeInfo) => SelectionSetNode;

  constructor(visitor: (node: SelectionSetNode, typeInfo: TypeInfo) => SelectionSetNode) {
    this.visitor = visitor;
  }

  public transformRequest(
    originalRequest: Request,
    delegationContext: DelegationContext,
    _transformationContext: Record<string, any>
  ): Request {
    const document = visitSelectionSets(
      originalRequest,
      delegationContext.info.schema,
      delegationContext.returnType,
      this.visitor
    );
    return {
      ...originalRequest,
      document,
    };
  }
}

function visitSelectionSets(
  request: Request,
  schema: GraphQLSchema,
  initialType: GraphQLOutputType,
  visitor: (node: SelectionSetNode, typeInfo: TypeInfo) => SelectionSetNode
): DocumentNode {
  const { document } = request;

  const typeInfo = new TypeInfo(schema, undefined, initialType);

  const newDefinitions: Array<DefinitionNode> = [];
  document.definitions.forEach(def => {
    if (def.kind === Kind.FRAGMENT_DEFINITION) {
      newDefinitions.push(visitNode(def, typeInfo, visitor));
    } else if (def.kind === Kind.OPERATION_DEFINITION) {
      const newSelections: Array<SelectionNode> = [];

      def.selectionSet.selections.forEach(selection => {
        if (selection.kind === Kind.FRAGMENT_SPREAD) {
          return;
        }

        if (selection.kind === Kind.INLINE_FRAGMENT) {
          newSelections.push(visitNode(selection, typeInfo, visitor));
          return;
        }

        const selectionSet = selection.selectionSet;

        if (selectionSet == null) {
          newSelections.push(selection);
          return;
        }

        const newSelectionSet = visitNode(selectionSet, typeInfo, visitor);

        if (newSelectionSet === selectionSet) {
          newSelections.push(selection);
          return;
        }

        newSelections.push({
          ...selection,
          selectionSet: newSelectionSet,
        });
      });

      newDefinitions.push({
        ...def,
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: newSelections,
        },
      });
    }
  });

  return {
    ...document,
    definitions: newDefinitions,
  };
}

function visitNode<T extends SelectionSetNode | FragmentDefinitionNode | InlineFragmentNode>(
  node: T,
  typeInfo: TypeInfo,
  visitor: (node: SelectionSetNode, typeInfo: TypeInfo) => SelectionSetNode
): T {
  return visit(
    node,
    visitWithTypeInfo(typeInfo, {
      [Kind.SELECTION_SET]: node => visitor(node, typeInfo),
    })
  );
}
