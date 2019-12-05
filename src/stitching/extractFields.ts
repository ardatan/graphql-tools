import { FieldNode, FragmentDefinitionNode } from 'graphql';
import { collectFields } from '../utils';

export function extractFields({
  fieldNode,
  path = [],
  fragments = {},
}: {
  fieldNode: FieldNode;
  path?: Array<string>;
  fragments?: Record<string, FragmentDefinitionNode>;
}) {
  const fieldNodes = collectFields(fieldNode.selectionSet, fragments);
  return path.length ? path.reduce(
    (acc, pathSegment) => extractOneLevelOfFields(acc, pathSegment, fragments),
    fieldNodes,
  ) : fieldNodes;
}

export function extractOneLevelOfFields(
  fieldNodes: ReadonlyArray<FieldNode>,
  fieldName: string,
  fragments: Record<string, FragmentDefinitionNode>,
) {
  const newFieldNodes: Array<FieldNode> = [];
  fieldNodes.forEach(fieldNode => {
    collectFields(fieldNode.selectionSet, fragments).forEach(selection => {
      if (selection.name.value === fieldName) {
        newFieldNodes.push(selection);
      }
    });
  });
  return newFieldNodes;
}
