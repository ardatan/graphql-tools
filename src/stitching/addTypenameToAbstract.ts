import {
  GraphQLType,
  DocumentNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  SelectionSetNode,
  Kind,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLSchema,
} from 'graphql';

export function addTypenameToAbstract(
  targetSchema: GraphQLSchema,
  document: DocumentNode,
): DocumentNode {
  const typeInfo = new TypeInfo(targetSchema);
  return visit(
    document,
    visitWithTypeInfo(typeInfo, {
      [Kind.SELECTION_SET](
        node: SelectionSetNode,
      ): SelectionSetNode | null | undefined {
        const parentType: GraphQLType = typeInfo.getParentType();
        let selections = node.selections;
        if (
          parentType &&
          (parentType instanceof GraphQLInterfaceType ||
            parentType instanceof GraphQLUnionType)
        ) {
          selections = selections.concat({
            kind: Kind.FIELD,
            name: {
              kind: Kind.NAME,
              value: '__typename',
            },
          });
        }

        if (selections !== node.selections) {
          return {
            ...node,
            selections,
          };
        }
      },
    }),
  );
}
