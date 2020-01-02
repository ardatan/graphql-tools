import {
  FieldNode,
  Kind,
  FragmentDefinitionNode,
  SelectionSetNode,
} from 'graphql';

export function renameFieldNode(fieldNode: FieldNode, name: string): FieldNode {
  return {
    ...fieldNode,
    alias: {
      kind: Kind.NAME,
      value: fieldNode.alias ? fieldNode.alias.value : fieldNode.name.value,
    },
    name: {
      kind: Kind.NAME,
      value: name,
    }
  };
}

export function preAliasFieldNode(fieldNode: FieldNode, str: string): FieldNode {
  return {
    ...fieldNode,
    alias: {
      kind: Kind.NAME,
      value: `${str}${fieldNode.alias ? fieldNode.alias.value : fieldNode.name.value}`,
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

export function hoistFieldNodes({
  fieldNode,
  fieldNames,
  path = [],
  delimeter = '__gqltf__',
  fragments,
}: {
  fieldNode: FieldNode;
  fieldNames?: Array<string>;
  path?: Array<string>;
  delimeter?: string;
  fragments: Record<string, FragmentDefinitionNode>;
}): Array<FieldNode> {
  const alias = fieldNode.alias ? fieldNode.alias.value : fieldNode.name.value;

  let newFieldNodes: Array<FieldNode> = [];

  if (path && path.length) {
    const remainingPathSegments = path.slice();
    const initialPathSegment = remainingPathSegments.shift();

    collectFields(fieldNode.selectionSet, fragments).forEach((possibleFieldNode: FieldNode) => {
      if (possibleFieldNode.name.value === initialPathSegment) {
        newFieldNodes = newFieldNodes.concat(hoistFieldNodes({
          fieldNode: preAliasFieldNode(possibleFieldNode, `${alias}${delimeter}`),
          fieldNames,
          path: remainingPathSegments,
          delimeter,
          fragments,
        }));
      }
    });
  } else {
    collectFields(fieldNode.selectionSet, fragments).forEach((possibleFieldNode: FieldNode) => {
      if (!fieldNames || fieldNames.includes(possibleFieldNode.name.value)) {
        newFieldNodes.push(preAliasFieldNode(possibleFieldNode, `${alias}${delimeter}`));
      }
    });
  }

  return newFieldNodes;
}
