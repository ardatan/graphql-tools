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
      return cacheResult(sortNodesByStringKey(nodes, node => node.name.value));
    }

    if (isOfKindList<VariableDefinitionNode>(nodes, Kind.VARIABLE_DEFINITION)) {
      return cacheResult(sortNodesByStringKey(nodes, node => node.variable.name.value));
    }

    if (isOfKindList<ArgumentNode>(nodes, Kind.ARGUMENT)) {
      return cacheResult(sortNodesByStringKey(nodes, node => node.name.value));
    }

    if (
      isOfKindList<SelectionNode>(nodes, [Kind.FIELD, Kind.FRAGMENT_SPREAD, Kind.INLINE_FRAGMENT])
    ) {
      return cacheResult(
        sortNodesByStringKey(nodes, node => {
          if (node.kind === Kind.FIELD) {
            return sortPrefixField + node.name.value;
          } else if (node.kind === Kind.FRAGMENT_SPREAD) {
            return sortPrefixFragmentSpread + node.name.value;
          } else {
            const typeCondition = node.typeCondition?.name.value ?? '';
            // if you have a better idea, send a PR :)
            const sortedNodes = buildInlineFragmentSelectionSetKey(
              cacheResult(sortExecutableNodes(node.selectionSet.selections)),
            );
            return sortPrefixInlineFragmentNode + typeCondition + sortedNodes;
          }
        }),
      );
    }

    return cacheResult(
      [...nodes].sort((a, b) => {
        const kindComparison = compareKeys(a.kind, b.kind);
        if (kindComparison !== 0) {
          return kindComparison;
        }
        return compareKeys(getNodeNameValue(a), getNodeNameValue(b));
      }),
    );
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

function sortNodesByStringKey<TNode extends ASTNode>(
  nodes: readonly TNode[],
  getKey: (node: TNode) => string | undefined,
): readonly TNode[] {
  return [...nodes].sort((a, b) => compareKeys(getKey(a), getKey(b)));
}

function compareKeys(a: string | undefined, b: string | undefined): number {
  if (a == null) {
    return b == null ? 0 : 1;
  }
  if (b == null) {
    return -1;
  }
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

function getNodeNameValue(node: ASTNode): string | undefined {
  return (node as { name?: { value?: string } }).name?.value;
}
