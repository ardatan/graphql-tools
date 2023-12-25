import { Kind, type StringValueNode } from 'graphql';

interface ObjectWithDescription {
  astNode?: {
    description?: StringValueNode | null;
  } | null;
  description?: string | null;
}

export function getDescriptionNode(obj: ObjectWithDescription): StringValueNode | undefined {
  if (obj.astNode?.description) {
    return {
      ...obj.astNode.description,
      block: true,
    };
  }
  if (obj.description) {
    return {
      kind: Kind.STRING,
      value: obj.description,
      block: true,
    };
  }
}
