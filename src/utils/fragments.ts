import {
  InlineFragmentNode,
  SelectionNode,
  Kind,
  parse,
  OperationDefinitionNode,
} from 'graphql';

export function concatInlineFragments(
  type: string,
  fragments: Array<InlineFragmentNode>,
): InlineFragmentNode {
  const fragmentSelections: Array<SelectionNode> = fragments.reduce(
    (selections, fragment) => selections.concat(fragment.selectionSet.selections),
    [],
  );

  const deduplicatedFragmentSelection: Array<SelectionNode> = deduplicateSelection(
    fragmentSelections,
  );

  return {
    kind: Kind.INLINE_FRAGMENT,
    typeCondition: {
      kind: Kind.NAMED_TYPE,
      name: {
        kind: Kind.NAME,
        value: type,
      },
    },
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: deduplicatedFragmentSelection,
    },
  };
}

const hasOwn = Object.prototype.hasOwnProperty;

function deduplicateSelection(nodes: Array<SelectionNode>): Array<SelectionNode> {
  const selectionMap = nodes.reduce<{ [key: string]: SelectionNode }>(
    (map, node) => {
      switch (node.kind) {
        case 'Field': {
          if (node.alias != null) {
            if (hasOwn.call(map, node.alias.value)) {
              return map;
            }

            return {
              ...map,
              [node.alias.value]: node,
            };
          }

          if (hasOwn.call(map, node.name.value)) {
            return map;
          }

          return {
            ...map,
            [node.name.value]: node,
          };
        }
        case 'FragmentSpread': {
          if (hasOwn.call(map, node.name.value)) {
            return map;
          }

          return {
            ...map,
            [node.name.value]: node,
          };
        }
        case 'InlineFragment': {
          if (map.__fragment != null) {
            const fragment = map.__fragment as InlineFragmentNode;

            return {
              ...map,
              __fragment: concatInlineFragments(
                fragment.typeCondition.name.value,
                [fragment, node],
              ),
            };
          }

          return {
            ...map,
            __fragment: node,
          };
        }
        default: {
          return map;
        }
      }
    },
    {},
  );

  const selection = Object.keys(selectionMap).reduce(
    (selectionList, node) => selectionList.concat(selectionMap[node]),
    [],
  );

  return selection;
}

export function parseFragmentToInlineFragment(
  definitions: string,
): InlineFragmentNode {
  if (definitions.trim().startsWith('fragment')) {
    const document = parse(definitions);
    for (const definition of document.definitions) {
      if (definition.kind === Kind.FRAGMENT_DEFINITION) {
        return {
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: definition.typeCondition,
          selectionSet: definition.selectionSet,
        };
      }
    }
  }

  const query = parse(`{${definitions}}`)
    .definitions[0] as OperationDefinitionNode;
  for (const selection of query.selectionSet.selections) {
    if (selection.kind === Kind.INLINE_FRAGMENT) {
      return selection;
    }
  }

  throw new Error('Could not parse fragment');
}
