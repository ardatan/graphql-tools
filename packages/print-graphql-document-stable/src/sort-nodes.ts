import {
  type ArgumentNode,
  type ASTNode,
  type DefinitionNode,
  type DirectiveNode,
  Kind,
  type SelectionNode,
  type VariableDefinitionNode,
  print,
} from 'graphql';
import sortBy from 'lodash.sortby';
import { normalizeWhiteSpace } from './normalize-whitespace.js';

// Cache the sorted nodes to avoid sorting the same nodes multiple times
const nodeSortCache = new WeakMap<readonly ASTNode[], readonly ASTNode[]>();

export function sortNodes(nodes: readonly DefinitionNode[]): readonly DefinitionNode[];
export function sortNodes(nodes: readonly SelectionNode[]): readonly SelectionNode[];
export function sortNodes(nodes: readonly ArgumentNode[] | undefined): readonly ArgumentNode[] | undefined;
export function sortNodes(
  nodes: readonly VariableDefinitionNode[] | undefined
): readonly VariableDefinitionNode[] | undefined;
export function sortNodes(nodes: readonly DirectiveNode[] | undefined): readonly DirectiveNode[] | undefined;
export function sortNodes(nodes: readonly ASTNode[] | undefined): readonly ASTNode[] | undefined {
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
      return cacheResult(sortBy(nodes, 'name.value'));
    }

    if (isOfKindList<VariableDefinitionNode>(nodes, Kind.VARIABLE_DEFINITION)) {
      return cacheResult(sortBy(nodes, 'variable.name.value'));
    }

    if (isOfKindList<ArgumentNode>(nodes, Kind.ARGUMENT)) {
      return cacheResult(sortBy(nodes, 'name.value'));
    }

    if (isOfKindList<SelectionNode>(nodes, [Kind.FIELD, Kind.FRAGMENT_SPREAD, Kind.INLINE_FRAGMENT])) {
      return cacheResult(
        sortBy(nodes, node => {
          if (node.kind === Kind.FIELD) {
            return `0` + node.name.value;
          } else if (node.kind === Kind.FRAGMENT_SPREAD) {
            return `1` + node.name.value;
          } else {
            const typeCondition = node.typeCondition?.name.value ?? '';
            // if you have a better idea, send a PR :)
            const sortedNodes = normalizeWhiteSpace(
              cacheResult(sortNodes(node.selectionSet.selections))
                .map(node => print(node))
                .join(' ')
            );
            return `2` + typeCondition + sortedNodes;
          }
        })
      );
    }

    return cacheResult(sortBy(nodes, 'kind', 'name.value'));
  }
}

function isOfKindList<T extends ASTNode>(nodes: readonly ASTNode[], kind: string | string[]): nodes is T[] {
  return typeof kind === 'string' ? nodes[0].kind === kind : kind.includes(nodes[0].kind);
}

// function buildSelectionSetKey
