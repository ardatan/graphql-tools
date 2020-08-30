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
  public transformRequest(
    originalRequest: Request,
    delegationContext: DelegationContext,
    _transformationContext: Record<string, any>
  ): Request {
    const document = wrapConcreteTypes(
      delegationContext.returnType,
      delegationContext.targetSchema,
      originalRequest.document
    );
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

  const typeInfo = new TypeInfo(targetSchema);
  const newDocument = visit(
    document,
    visitWithTypeInfo(typeInfo, {
      [Kind.FIELD]: (node: FieldNode) => {
        if (isAbstractType(getNamedType(typeInfo.getType()))) {
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
        }
      },
    }),
    // visitorKeys argument usage a la https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js
    // empty keys cannot be removed only because of typescript errors
    // will hopefully be fixed in future version of graphql-js to be optional
    {
      Name: [],

      Document: ['definitions'],
      OperationDefinition: ['selectionSet'],
      VariableDefinition: [],
      Variable: [],
      SelectionSet: ['selections'],
      Field: [],
      Argument: [],

      FragmentSpread: [],
      InlineFragment: ['selectionSet'],
      FragmentDefinition: ['selectionSet'],

      IntValue: [],
      FloatValue: [],
      StringValue: [],
      BooleanValue: [],
      NullValue: [],
      EnumValue: [],
      ListValue: [],
      ObjectValue: [],
      ObjectField: [],

      Directive: [],

      NamedType: [],
      ListType: [],
      NonNullType: [],

      SchemaDefinition: [],
      OperationTypeDefinition: [],

      ScalarTypeDefinition: [],
      ObjectTypeDefinition: [],
      FieldDefinition: [],
      InputValueDefinition: [],
      InterfaceTypeDefinition: [],
      UnionTypeDefinition: [],
      EnumTypeDefinition: [],
      EnumValueDefinition: [],
      InputObjectTypeDefinition: [],

      DirectiveDefinition: [],

      SchemaExtension: [],

      ScalarTypeExtension: [],
      ObjectTypeExtension: [],
      InterfaceTypeExtension: [],
      UnionTypeExtension: [],
      EnumTypeExtension: [],
      InputObjectTypeExtension: [],
    }
  );

  return newDocument;
}
