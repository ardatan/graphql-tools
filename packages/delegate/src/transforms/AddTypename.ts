import {
  GraphQLType,
  DocumentNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  SelectionSetNode,
  Kind,
  GraphQLSchema,
} from 'graphql';

import { Request } from '@graphql-tools/utils';

import { Transform, DelegationContext } from '../types';

export default class AddTypename implements Transform {
  public transformRequest(
    originalRequest: Request,
    delegationContext: DelegationContext,
    _transformationContext: Record<string, any>
  ): Request {
    const document = addTypename(delegationContext.targetSchema, originalRequest.document);
    return {
      ...originalRequest,
      document,
    };
  }
}

function addTypename(targetSchema: GraphQLSchema, document: DocumentNode): DocumentNode {
  const typeInfo = new TypeInfo(targetSchema);
  const subscriptionType = targetSchema.getSubscriptionType();
  return visit(
    document,
    visitWithTypeInfo(typeInfo, {
      [Kind.SELECTION_SET](node: SelectionSetNode): SelectionSetNode | null | undefined {
        const parentType: GraphQLType = typeInfo.getParentType();
        let selections = node.selections;
        if (parentType !== subscriptionType) {
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
