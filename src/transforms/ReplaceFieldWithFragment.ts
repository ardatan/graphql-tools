import {
  DocumentNode,
  GraphQLSchema,
  GraphQLType,
  InlineFragmentNode,
  Kind,
  SelectionSetNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
} from 'graphql';
import { Request } from '../Interfaces';
import { Transform } from './transforms';

export type FieldToFragmentMapping = {
  [typeName: string]: { [fieldName: string]: InlineFragmentNode };
};

export default function ReplaceFieldWithFragment(
  targetSchema: GraphQLSchema,
  mapping: FieldToFragmentMapping,
): Transform {
  return {
    transformRequest(originalRequest: Request): Request {
      const document = replaceFieldsWithFragments(
        targetSchema,
        originalRequest.document,
        mapping,
      );
      return {
        ...originalRequest,
        document,
      };
    },
  };
}

function replaceFieldsWithFragments(
  targetSchema: GraphQLSchema,
  document: DocumentNode,
  mapping: FieldToFragmentMapping,
): DocumentNode {
  const typeInfo = new TypeInfo(targetSchema);
  return visit(
    document,
    visitWithTypeInfo(typeInfo, {
      [Kind.SELECTION_SET](
        node: SelectionSetNode,
      ): SelectionSetNode | null | undefined {
        const parentType: GraphQLType = typeInfo.getParentType();
        if (parentType) {
          const parentTypeName = parentType.name;

          let selections = node.selections;

          if (mapping[parentTypeName]) {
            node.selections.forEach(selection => {
              if (selection.kind === Kind.FIELD) {
                const name = selection.name.value;
                const fragment = mapping[parentTypeName][name];
                if (fragment) {
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
    }),
  );
}
