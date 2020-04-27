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

import { concatInlineFragments } from '../../utils/fragments';
import { Transform, Request } from '../../Interfaces';

export default class ReplaceFieldWithFragment implements Transform {
  private readonly targetSchema: GraphQLSchema;
  private readonly mapping: FieldToFragmentMapping;

  constructor(
    targetSchema: GraphQLSchema,
    fragments: Array<{
      field: string;
      fragment: string;
    }>
  ) {
    this.targetSchema = targetSchema;
    this.mapping = {};
    for (const { field, fragment } of fragments) {
      const parsedFragment = parseFragmentToInlineFragment(fragment);
      const actualTypeName = parsedFragment.typeCondition.name.value;
      if (!(actualTypeName in this.mapping)) {
        this.mapping[actualTypeName] = Object.create(null);
      }

      const typeMapping = this.mapping[actualTypeName];

      if (!(field in typeMapping)) {
        typeMapping[field] = [parsedFragment];
      } else {
        typeMapping[field].push(parsedFragment);
      }
    }
  }

  public transformRequest(originalRequest: Request): Request {
    const document = replaceFieldsWithFragments(this.targetSchema, originalRequest.document, this.mapping);
    return {
      ...originalRequest,
      document,
    };
  }
}

type FieldToFragmentMapping = {
  [typeName: string]: { [fieldName: string]: Array<InlineFragmentNode> };
};

function replaceFieldsWithFragments(
  targetSchema: GraphQLSchema,
  document: DocumentNode,
  mapping: FieldToFragmentMapping
): DocumentNode {
  const typeInfo = new TypeInfo(targetSchema);
  return visit(
    document,
    visitWithTypeInfo(typeInfo, {
      [Kind.SELECTION_SET](node: SelectionSetNode): SelectionSetNode | null | undefined {
        const parentType: GraphQLType = typeInfo.getParentType();
        if (parentType != null) {
          const parentTypeName = parentType.name;
          let selections = node.selections;

          if (parentTypeName in mapping) {
            node.selections.forEach(selection => {
              if (selection.kind === Kind.FIELD) {
                const name = selection.name.value;
                const fragments = mapping[parentTypeName][name];
                if (fragments != null && fragments.length > 0) {
                  const fragment = concatInlineFragments(parentTypeName, fragments);
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
    })
  );
}

function parseFragmentToInlineFragment(definitions: string): InlineFragmentNode {
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

  const query = parse(`{${definitions}}`).definitions[0] as OperationDefinitionNode;
  for (const selection of query.selectionSet.selections) {
    if (selection.kind === Kind.INLINE_FRAGMENT) {
      return selection;
    }
  }

  throw new Error('Could not parse fragment');
}
