import { DirectiveUsage } from './types.js';

import {
  ASTNode,
  DocumentNode,
  Kind,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
  valueFromASTUntyped,
} from 'graphql';

function isTypeWithFields(t: ASTNode): t is ObjectTypeDefinitionNode {
  return t.kind === Kind.OBJECT_TYPE_DEFINITION || t.kind === Kind.OBJECT_TYPE_EXTENSION;
}

export type ArgumentToDirectives = {
  [argumentName: string]: DirectiveUsage[];
};
export type TypeAndFieldToArgumentDirectives = {
  [typeAndField: string]: ArgumentToDirectives;
};

export function getArgumentsWithDirectives(documentNode: DocumentNode): TypeAndFieldToArgumentDirectives {
  const result: TypeAndFieldToArgumentDirectives = {};

  const allTypes = documentNode.definitions.filter(isTypeWithFields);

  for (const type of allTypes) {
    if (type.fields == null) {
      continue;
    }

    for (const field of type.fields) {
      const argsWithDirectives = field.arguments?.filter(arg => arg.directives?.length);

      if (!argsWithDirectives.length) {
        continue;
      }

      const typeFieldResult = (result[`${type.name.value}.${field.name.value}`] = {});

      for (const arg of argsWithDirectives) {
        // TODO share that code with getFieldsWithDirectives
        const directives: DirectiveUsage[] = arg.directives.map(d => ({
          name: d.name.value,
          args: (d.arguments || []).reduce(
            (prev, dArg) => ({ ...prev, [dArg.name.value]: valueFromASTUntyped(dArg.value) }),
            {}
          ),
        }));

        typeFieldResult[arg.name.value] = directives;
      }
    }
  }

  return result;

  return Object.assign(
    {},
    ...allTypes.map((type: ObjectTypeDefinitionNode | ObjectTypeExtensionNode) => {
      const typeName = type.name.value;
      return _.chain(type.fields)
        .keyBy(getNodeName)
        .mapValues(field => ({ type, field }))
        .mapKeys((_, fieldName) => `${typeName}.${fieldName}`)
        .value();
    })
  );
}
