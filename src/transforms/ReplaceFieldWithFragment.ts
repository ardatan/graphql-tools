import {
  DocumentNode,
  GraphQLSchema,
  GraphQLType,
  InlineFragmentNode,
  Kind,
  SelectionSetNode,
  TypeInfo,
  OperationDefinitionNode,
  parse,
  visit,
  visitWithTypeInfo,
} from 'graphql';
import { Request } from '../Interfaces';
import { Transform } from './transforms';

export default class ReplaceFieldWithFragment implements Transform {
  private targetSchema: GraphQLSchema;
  private mapping: FieldToFragmentMapping;

  constructor(
    targetSchema: GraphQLSchema,
    fragments: Array<{
      field: string;
      fragment: string;
    }>,
  ) {
    this.targetSchema = targetSchema;
    this.mapping = {};
    for (const { field, fragment } of fragments) {
      const parsedFragment = parseFragmentToInlineFragment(fragment);
      const actualTypeName = parsedFragment.typeCondition.name.value;
      this.mapping[actualTypeName] = fragments[actualTypeName] || {};
      this.mapping[actualTypeName][field] = parsedFragment;
    }
  }

  public transformRequest(originalRequest: Request): Request {
    const document = replaceFieldsWithFragments(
      this.targetSchema,
      originalRequest.document,
      this.mapping,
    );
    return {
      ...originalRequest,
      document,
    };
  }
}

type FieldToFragmentMapping = {
  [typeName: string]: { [fieldName: string]: InlineFragmentNode };
};

function replaceFieldsWithFragments(
  targetSchema: GraphQLSchema,
  document: DocumentNode,
  mapping: FieldToFragmentMapping,
): DocumentNode {
  const typeInfo = new TypeInfo(targetSchema);
  return visit(
    document,
    visitWithTypeInfo(typeInfo, {
      [Kind.SELECTION_SET](
        node: SelectionSetNode,
      ): SelectionSetNode | null | undefined {
        const parentType: GraphQLType = typeInfo.getParentType();
        if (parentType) {
          const parentTypeName = parentType.name;
          let selections = node.selections;

          if (mapping[parentTypeName]) {
            node.selections.forEach(selection => {
              if (selection.kind === Kind.FIELD) {
                const name = selection.name.value;
                const fragment = mapping[parentTypeName][name];
                if (fragment) {
                  selections = selections.concat(fragment);
                }
              }
            });
          }

          if (selections !== node.selections) {
            return {
              ...node,
              selections,
            };
          }
        }
      },
    }),
  );
}

function parseFragmentToInlineFragment(
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
