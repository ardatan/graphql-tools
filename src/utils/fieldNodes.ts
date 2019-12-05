import {
  FieldNode,
  Kind,
  FragmentDefinitionNode,
  SelectionSetNode,
} from 'graphql';

export function renameFieldNode(fieldNode: FieldNode, name: string): FieldNode {
  return {
    ...fieldNode,
    name: {
      ...fieldNode.name,
      value: name,
    }
  };
}

export function wrapFieldNode(fieldNode: FieldNode, path: Array<string>): FieldNode {
  let newFieldNode = fieldNode;
  path.forEach(fieldName => {
    newFieldNode = {
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: fieldName,
      },
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: [
          fieldNode,
        ]
      }
    };
  });
  return newFieldNode;
}

export function collectFields(
  selectionSet: SelectionSetNode,
  fragments: Record<string, FragmentDefinitionNode>,
  fields: Array<FieldNode> = [],
  visitedFragmentNames = {}
): Array<FieldNode> {
  selectionSet.selections.forEach(selection => {
    switch (selection.kind) {
      case Kind.FIELD:
        fields.push(selection);
        break;
      case Kind.INLINE_FRAGMENT:
        collectFields(
          selection.selectionSet,
          fragments,
          fields,
          visitedFragmentNames
        );
        break;
      case Kind.FRAGMENT_SPREAD:
        const fragmentName = selection.name.value;
        if (!visitedFragmentNames[fragmentName]) {
          collectFields(
            fragments[fragmentName].selectionSet,
            fragments,
            fields,
            visitedFragmentNames
          );
        }
        break;
      default: // unreachable
        break;
    }
  });

  return fields;
}
