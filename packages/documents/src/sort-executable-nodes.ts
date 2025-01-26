import {
  Kind,
  print,
  type ArgumentNode,
  type ASTNode,
  type DefinitionNode,
  type DirectiveNode,
  type SelectionNode,
  type VariableDefinitionNode,
} from 'graphql';
import { normalizeWhiteSpace } from './normalize-whitespace.js';

// Cache the sorted nodes to avoid sorting the same nodes multiple times
const nodeSortCache = new WeakMap<readonly ASTNode[], readonly ASTNode[]>();

export function sortExecutableNodes(nodes: readonly DefinitionNode[]): readonly DefinitionNode[];
export function sortExecutableNodes(nodes: readonly SelectionNode[]): readonly SelectionNode[];
export function sortExecutableNodes(
  nodes: readonly ArgumentNode[] | undefined,
): readonly ArgumentNode[] | undefined;
export function sortExecutableNodes(
  nodes: readonly VariableDefinitionNode[] | undefined,
): readonly VariableDefinitionNode[] | undefined;
export function sortExecutableNodes(
  nodes: readonly DirectiveNode[] | undefined,
): readonly DirectiveNode[] | undefined;
export function sortExecutableNodes(
  nodes: readonly ASTNode[] | undefined,
): readonly ASTNode[] | undefined {
  if (nodes) {
    const shortcutNodes = nodeSortCache.get(nodes);
    if (shortcutNodes) {
      return shortcutNodes;
    }

    const cacheResult = (resultNodes: readonly ASTNode[]): readonly ASTNode[] => {
      nodeSortCache.set(nodes, resultNodes);
      return resultNodes;
    };

    if (nodes.length === 0) {
      return [];
    }

    if (isOfKindList<DirectiveNode>(nodes, Kind.DIRECTIVE)) {
      return cacheResult(nodes.sort((a, b) => a.name.value.localeCompare(b.name.value)));
    }

    if (isOfKindList<VariableDefinitionNode>(nodes, Kind.VARIABLE_DEFINITION)) {
      return cacheResult(nodes.sort((a, b) => a.variable.name.value.localeCompare(b.variable.name.value)));
    }

    if (isOfKindList<ArgumentNode>(nodes, Kind.ARGUMENT)) {
      return cacheResult(nodes.sort((a, b) => a.name.value.localeCompare(b.name.value)));
    }

    if (
      isOfKindList<SelectionNode>(nodes, [Kind.FIELD, Kind.FRAGMENT_SPREAD, Kind.INLINE_FRAGMENT])
    ) {
      return cacheResult(
       nodes.sort((a, b) => {
        const getSortKey = (node: SelectionNode) => {
          if (node.kind === Kind.FIELD) {
            return sortPrefixField + node.name.value;
          } else if (node.kind === Kind.FRAGMENT_SPREAD) {
            return sortPrefixFragmentSpread + node.name.value;
          } else {
            const typeCondition = node.typeCondition?.name.value ?? '';
            const sortedSelections = buildInlineFragmentSelectionSetKey(
              cacheResult(sortExecutableNodes(node.selectionSet.selections))
            );
            return sortPrefixInlineFragmentNode + typeCondition + sortedSelections;
          }
        };

        return getSortKey(a).localeCompare(getSortKey(b));
        }),
      );
    }

    return cacheResult(nodes.toSorted((nodeA, nodeB) => {
      const kindComparison = nodeA.kind.localeCompare(nodeB.kind);
      if (kindComparison !== 0) {
        return kindComparison;
      }

      const nameA = (nodeA as any).name?.value ?? '';
      const nameB = (nodeB as any).name?.value ?? '';

      return nameA.localeCompare(nameB);
    }));
  }
}

const sortPrefixField = '0';
const sortPrefixFragmentSpread = '1';
const sortPrefixInlineFragmentNode = '2';

function isOfKindList<T extends ASTNode>(
  nodes: readonly ASTNode[],
  kind: string | string[],
): nodes is T[] {
  return typeof kind === 'string' ? nodes[0].kind === kind : kind.includes(nodes[0].kind);
}

function buildInlineFragmentSelectionSetKey(nodes: readonly ASTNode[]): string {
  return normalizeWhiteSpace(nodes.map(node => print(node)).join(' '));
}
