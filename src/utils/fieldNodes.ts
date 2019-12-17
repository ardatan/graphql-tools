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

export function preAliasFieldNode(fieldNode: FieldNode, str: string): FieldNode {
  return {
    ...fieldNode,
    alias: {
      ...fieldNode.name,
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
  path,
  delimeter = '__gqltf__',
  fragments,
}: {
  fieldNode: FieldNode;
  fieldNames?: Array<string>;
  path: Array<string>;
  delimeter?: string;
  fragments: Record<string, FragmentDefinitionNode>;
}): Array<FieldNode> {
  const newFieldNode = path.reduce((acc, pathSegment) => {
    const alias = acc.alias ? acc.alias.value : acc.name.value;
    const newFieldNodes: Array<FieldNode> = [];
    collectFields(acc.selectionSet, fragments).forEach((possibleFieldNode: FieldNode) => {
      if (possibleFieldNode.name.value === pathSegment) {
        newFieldNodes.push(preAliasFieldNode(possibleFieldNode, `${alias}${delimeter}`));
      }
    });

    return {
      ...acc,
      selectionSet: {
        ...acc.selectionSet,
        selections: newFieldNodes,
      }
    };
  }, fieldNode);

  const finalFieldNodes: Array<FieldNode> = [];
  collectFields(newFieldNode.selectionSet, fragments).forEach((finalfieldNode: FieldNode) => {
    const alias = finalfieldNode.alias ? finalfieldNode.alias.value : finalfieldNode.name.value;
    collectFields(finalfieldNode.selectionSet, fragments).forEach((possibleFieldNode: FieldNode) => {
      if (!fieldNames || fieldNames.includes(possibleFieldNode.name.value)) {
        finalFieldNodes.push(preAliasFieldNode(possibleFieldNode, `${alias}${delimeter}`));
      }
    });
  });

  return finalFieldNodes;
}
