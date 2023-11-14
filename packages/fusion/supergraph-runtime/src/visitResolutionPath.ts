import {
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  Kind,
  OperationDefinitionNode,
  SelectionNode,
} from 'graphql';

interface ResolutionPathVisitorContext {
  node: FieldNode;
  path: Array<string>;
}

export function visitResolutionPath<T>(
  document: DocumentNode,
  visitFn: (ctx: ResolutionPathVisitorContext) => T,
) {
  const operations: OperationDefinitionNode[] = [];
  const fragments: Record<string, FragmentDefinitionNode> = {};
  for (const definition of document.definitions) {
    if (definition.kind === 'OperationDefinition') {
      operations.push(definition);
    } else if (definition.kind === 'FragmentDefinition') {
      fragments[definition.name.value] = definition;
    }
  }

  function visitSelectionNode(selectionNode: SelectionNode, parentPath: string[]) {
    switch (selectionNode.kind) {
      case Kind.FIELD: {
        const currentPath = [...parentPath, selectionNode.alias?.value || selectionNode.name.value];
        visitFn({
          node: selectionNode,
          path: currentPath,
        });
        selectionNode.selectionSet?.selections?.forEach(selection => {
          visitSelectionNode(selection, currentPath);
        });
        break;
      }
      case Kind.INLINE_FRAGMENT: {
        selectionNode.selectionSet.selections.forEach(selection => {
          visitSelectionNode(selection, parentPath);
        });
        break;
      }
      case Kind.FRAGMENT_SPREAD: {
        const fragment = fragments[selectionNode.name.value];
        if (!fragment) {
          throw new Error(`No fragment found with name ${selectionNode.name.value}`);
        }
        fragment.selectionSet.selections.forEach(selection => {
          visitSelectionNode(selection, parentPath);
        });
        break;
      }
    }
  }
  for (const operationNode of operations) {
    operationNode.selectionSet.selections.forEach(selection => {
      visitSelectionNode(selection, []);
    });
  }
}
