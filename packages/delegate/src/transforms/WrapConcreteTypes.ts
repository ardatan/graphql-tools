import {
  DocumentNode,
  GraphQLSchema,
  Kind,
  getNamedType,
  GraphQLOutputType,
  isAbstractType,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  isObjectType,
  FieldNode,
} from 'graphql';

import { Request } from '@graphql-tools/utils';

import { Transform, DelegationContext } from '../types';

// For motivation, see https://github.com/ardatan/graphql-tools/issues/751

export default class WrapConcreteTypes implements Transform {
  private readonly returnType: GraphQLOutputType;
  private readonly targetSchema: GraphQLSchema;

  constructor(returnType: GraphQLOutputType, targetSchema: GraphQLSchema) {
    this.returnType = returnType;
    this.targetSchema = targetSchema;
  }

  public transformRequest(
    originalRequest: Request,
    _delegationContext: DelegationContext,
    _transformationContext: Record<string, any>
  ): Request {
    const document = wrapConcreteTypes(this.returnType, this.targetSchema, originalRequest.document);
    return {
      ...originalRequest,
      document,
    };
  }
}

function wrapConcreteTypes(
  returnType: GraphQLOutputType,
  targetSchema: GraphQLSchema,
  document: DocumentNode
): DocumentNode {
  const namedType = getNamedType(returnType);

  if (!isObjectType(namedType)) {
    return document;
  }

  const queryRootType = targetSchema.getQueryType();
  const mutationRootType = targetSchema.getMutationType();
  const subscriptionRootType = targetSchema.getSubscriptionType();

  const typeInfo = new TypeInfo(targetSchema);
  const newDocument = visit(
    document,
    visitWithTypeInfo(typeInfo, {
      [Kind.FIELD](node: FieldNode) {
        const maybeType = typeInfo.getParentType();
        if (maybeType == null) {
          return false;
        }

        const parentType = getNamedType(maybeType);
        if (parentType !== queryRootType && parentType !== mutationRootType && parentType !== subscriptionRootType) {
          return false;
        }

        if (!isAbstractType(getNamedType(typeInfo.getType()))) {
          return false;
        }

        return {
          ...node,
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [
              {
                kind: Kind.INLINE_FRAGMENT,
                typeCondition: {
                  kind: Kind.NAMED_TYPE,
                  name: {
                    kind: Kind.NAME,
                    value: namedType.name,
                  },
                },
                selectionSet: node.selectionSet,
              },
            ],
          },
        };
      },
    })
  );

  return newDocument;
}
