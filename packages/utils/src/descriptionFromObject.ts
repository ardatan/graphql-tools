import { Kind, type StringValueNode } from 'graphql';

interface ObjectWithDescription {
  astNode?: {
    description?: StringValueNode | null;
  } | null;
  description?: string | null;
}

function isMeaningfulDescription(description: string): boolean {
  return description.trim().length > 0;
}

export function getDescriptionNode(obj: ObjectWithDescription): StringValueNode | undefined {
  // Prefer the runtime `description` over a stale `astNode` description.
  // Schema transforms (e.g. mapSchema) update config descriptions without rewriting astNode (#5508).
  // Skip empty/whitespace-only strings so loaders that set `description: ""` do not print `""""""`.
  if (typeof obj.description === 'string') {
    if (!isMeaningfulDescription(obj.description)) {
      return undefined;
    }
    return {
      kind: Kind.STRING,
      value: obj.description,
      block: true,
    };
  }
  if (obj.astNode?.description && isMeaningfulDescription(obj.astNode.description.value)) {
    return {
      ...obj.astNode.description,
      block: true,
    };
  }
}
