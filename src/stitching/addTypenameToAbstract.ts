import {
  GraphQLType,
  DocumentNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  SelectionSetNode,
  Kind,
  FieldNode,
  GraphQLInterfaceType,
  GraphQLUnionType,
} from 'graphql';
import { GraphQLSchemaWithTransforms } from '../Interfaces';

export function addTypenameToAbstract(
  targetSchema: GraphQLSchemaWithTransforms,
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
            parentType instanceof GraphQLUnionType) &&
          !selections.find(
            _ =>
              (_ as FieldNode).kind === Kind.FIELD &&
              (_ as FieldNode).name.value === '__typename',
          )
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
