import { print, ASTNode } from 'graphql';

import { ITypedef } from '@graphql-tools/utils';

export function concatenateTypeDefs(
  typeDefinitionsAry: Array<ITypedef>,
  calledFunctionRefs = new Set<ITypedef>()
): string {
  const resolvedTypeDefinitions = new Set<string>();
  typeDefinitionsAry.forEach((typeDef: ITypedef) => {
    if (typeof typeDef === 'function') {
      if (!calledFunctionRefs.has(typeDef)) {
        calledFunctionRefs.add(typeDef);
        resolvedTypeDefinitions.add(concatenateTypeDefs(typeDef(), calledFunctionRefs));
      }
    } else if (typeof typeDef === 'string') {
      resolvedTypeDefinitions.add(typeDef.trim());
    } else if ((typeDef as ASTNode).kind !== undefined) {
      resolvedTypeDefinitions.add(print(typeDef).trim());
    } else {
      const type = typeof typeDef;
      throw new Error(`typeDef array must contain only strings, documents, or functions, got ${type}`);
    }
  });
  return [...resolvedTypeDefinitions].join('\n');
}
