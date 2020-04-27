import {
  GraphQLType,
  DocumentNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  SelectionSetNode,
  Kind,
  GraphQLSchema,
  isAbstractType,
} from 'graphql';

import { Transform, Request } from '../../Interfaces';

export default class AddTypenameToAbstract implements Transform {
  private readonly targetSchema: GraphQLSchema;

  constructor(targetSchema: GraphQLSchema) {
    this.targetSchema = targetSchema;
  }

  public transformRequest(originalRequest: Request): Request {
    const document = addTypenameToAbstract(this.targetSchema, originalRequest.document);
    return {
      ...originalRequest,
      document,
    };
  }
}

function addTypenameToAbstract(targetSchema: GraphQLSchema, document: DocumentNode): DocumentNode {
  const typeInfo = new TypeInfo(targetSchema);
  return visit(
    document,
    visitWithTypeInfo(typeInfo, {
      [Kind.SELECTION_SET](node: SelectionSetNode): SelectionSetNode | null | undefined {
        const parentType: GraphQLType = typeInfo.getParentType();
        let selections = node.selections;
        if (parentType != null && isAbstractType(parentType)) {
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
    })
  );
}
