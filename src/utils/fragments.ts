import {
  InlineFragmentNode,
  SelectionNode,
  Kind,
  parse,
  OperationDefinitionNode,
} from 'graphql';

export function concatInlineFragments(
  type: string,
  fragments: InlineFragmentNode[],
): InlineFragmentNode {
  const fragmentSelections: SelectionNode[] = fragments.reduce(
    (selections, fragment) => {
      return selections.concat(fragment.selectionSet.selections);
    },
    [],
  );

  const deduplicatedFragmentSelection: SelectionNode[] = deduplicateSelection(
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

function deduplicateSelection(nodes: SelectionNode[]): SelectionNode[] {
  const selectionMap = nodes.reduce<{ [key: string]: SelectionNode }>(
    (map, node) => {
      switch (node.kind) {
        case 'Field': {
          if (node.alias) {
            if (map.hasOwnProperty(node.alias.value)) {
              return map;
            } else {
              return {
                ...map,
                [node.alias.value]: node,
              };
            }
          } else {
            if (map.hasOwnProperty(node.name.value)) {
              return map;
            } else {
              return {
                ...map,
                [node.name.value]: node,
              };
            }
          }
        }
        case 'FragmentSpread': {
          if (map.hasOwnProperty(node.name.value)) {
            return map;
          } else {
            return {
              ...map,
              [node.name.value]: node,
            };
          }
        }
        case 'InlineFragment': {
          if (map.__fragment) {
            const fragment = map.__fragment as InlineFragmentNode;

            return {
              ...map,
              __fragment: concatInlineFragments(
                fragment.typeCondition.name.value,
                [fragment, node],
              ),
            };
          } else {
            return {
              ...map,
              __fragment: node,
            };
          }
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

export function objectContainsInlineFragment(object: any, fragment: InlineFragmentNode): boolean {
  for (const selection of fragment.selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      if (selection.alias) {
        if (!object[selection.alias.value]) {
          return false;
        }
      } else {
        if (!object[selection.name.value]) {
          return false;
        }
      }
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      const containsFragment = objectContainsInlineFragment(object, selection);
      if (!containsFragment) {
        return false;
      }
    }
  }

  return true;
}
