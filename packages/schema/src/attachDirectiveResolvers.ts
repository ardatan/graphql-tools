import { GraphQLSchema, defaultFieldResolver } from 'graphql';

import { IDirectiveResolvers, mapSchema, MapperKind, getDirectives } from '@graphql-tools/utils';

export function attachDirectiveResolvers(
  schema: GraphQLSchema,
  directiveResolvers: IDirectiveResolvers
): GraphQLSchema {
  if (typeof directiveResolvers !== 'object') {
    throw new Error(`Expected directiveResolvers to be of type object, got ${typeof directiveResolvers}`);
  }

  if (Array.isArray(directiveResolvers)) {
    throw new Error('Expected directiveResolvers to be of type object, got Array');
  }

  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      const newFieldConfig = { ...fieldConfig };

      const directives = getDirectives(schema, fieldConfig);
      Object.keys(directives).forEach(directiveName => {
        if (directiveResolvers[directiveName]) {
          const resolver = directiveResolvers[directiveName];
          const originalResolver = newFieldConfig.resolve != null ? newFieldConfig.resolve : defaultFieldResolver;
          const directiveArgs = directives[directiveName];
          newFieldConfig.resolve = (source, originalArgs, context, info) => {
            return resolver(
              () =>
                new Promise((resolve, reject) => {
                  const result = originalResolver(source, originalArgs, context, info);
                  if (result instanceof Error) {
                    reject(result);
                  }
                  resolve(result);
                }),
              source,
              directiveArgs,
              context,
              info
            );
          };
        }
      });

      return newFieldConfig;
    },
  });
}
