import {
  DocumentNode,
  FieldNode,
  GraphQLInterfaceType,
  GraphQLSchema,
  GraphQLType,
  GraphQLUnionType,
  Kind,
  SelectionSetNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
} from 'graphql';
import { Request } from '../Interfaces';
import { Transform } from './transforms';

export default function AddTypenameToAbstract(
  targetSchema: GraphQLSchema,
): Transform {
  return {
    transformRequest(originalRequest: Request): Request {
      const document = addTypenameToAbstract(
        targetSchema,
        originalRequest.document,
      );
      return {
        ...originalRequest,
        document,
      };
    },
  };
}

function addTypenameToAbstract(
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
