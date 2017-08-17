import { ASTNode, GraphQLSchema, visit, FieldNode, Kind } from 'graphql';

export default function addTypenameForFragments<T extends ASTNode>(
  node: T,
  schema: GraphQLSchema,
): T {
  return visit(node, {
    [Kind.FIELD]: {
      leave(field: FieldNode) {
        if (field.selectionSet) {
          const selections = field.selectionSet.selections;

          let hasFragment = false;
          let hasTypename = false;

          selections.forEach(selection => {
            if (
              selection.kind === Kind.INLINE_FRAGMENT ||
              selection.kind === Kind.FRAGMENT_SPREAD
            ) {
              hasFragment = true;
            } else if (selection.name.value === '__typename') {
              hasTypename = true;
            }
          });

          if (hasFragment && !hasTypename) {
            return {
              ...field,
              selectionSet: {
                ...field.selectionSet,
                selections: [
                  ...field.selectionSet.selections,
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: '__typename',
                    },
                  } as FieldNode,
                ],
              },
            } as FieldNode;
          }

          return field;
        }
        return field;
      },
    },
  });
}
