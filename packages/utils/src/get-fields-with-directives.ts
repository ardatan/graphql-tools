import {
  DocumentNode,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
  InputObjectTypeDefinitionNode,
  InputObjectTypeExtensionNode,
  valueFromASTUntyped,
} from 'graphql';
import { DirectiveUsage } from './types.js';

export type TypeAndFieldToDirectives = {
  [typeAndField: string]: DirectiveUsage[];
};

interface Options {
  includeInputTypes?: boolean;
}

type SelectedNodes =
  | ObjectTypeDefinitionNode
  | ObjectTypeExtensionNode
  | InputObjectTypeDefinitionNode
  | InputObjectTypeExtensionNode;

export function getFieldsWithDirectives(documentNode: DocumentNode, options: Options = {}): TypeAndFieldToDirectives {
  const result: TypeAndFieldToDirectives = {};

  let selected = ['ObjectTypeDefinition', 'ObjectTypeExtension'];

  if (options.includeInputTypes) {
    selected = [...selected, 'InputObjectTypeDefinition', 'InputObjectTypeExtension'];
  }

  const allTypes = documentNode.definitions.filter(obj => selected.includes(obj.kind)) as SelectedNodes[];

  for (const type of allTypes) {
    const typeName = type.name.value;

    if (type.fields == null) {
      continue;
    }

    for (const field of type.fields) {
      if (field.directives && field.directives.length > 0) {
        const fieldName = field.name.value;
        const key = `${typeName}.${fieldName}`;
        const directives: DirectiveUsage[] = field.directives.map(d => ({
          name: d.name.value,
          args: (d.arguments || []).reduce(
            (prev, arg) => ({ ...prev, [arg.name.value]: valueFromASTUntyped(arg.value) }),
            {}
          ),
        }));

        result[key] = directives;
      }
    }
  }

  return result;
}
