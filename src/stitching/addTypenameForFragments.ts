import { ASTNode, GraphQLSchema, visit, SelectionSetNode, FieldNode, Kind } from 'graphql';

export default function addTypenameForFragments<T extends ASTNode>(
  node: T,
  schema: GraphQLSchema,
): T {
  return visit(node, {
    [Kind.SELECTION_SET]: {
      leave(selectionSet: SelectionSetNode) {
        const selections = selectionSet.selections;

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
            ...selectionSet,
            selections: [
              ...selectionSet.selections,
              {
                kind: 'Field',
                name: {
                  kind: 'Name',
                  value: '__typename',
                },
              } as FieldNode,
            ],
          };
        }

        return selectionSet;
      },
    },
  });
}
