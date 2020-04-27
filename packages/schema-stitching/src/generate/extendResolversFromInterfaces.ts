import { GraphQLSchema } from 'graphql';

import { IResolvers } from '../Interfaces';

export function extendResolversFromInterfaces(schema: GraphQLSchema, resolvers: IResolvers) {
  const typeNames = Object.keys({
    ...schema.getTypeMap(),
    ...resolvers,
  });

  const extendedResolvers: IResolvers = {};
  typeNames.forEach(typeName => {
    const typeResolvers = resolvers[typeName];
    const type = schema.getType(typeName);
    if ('getInterfaces' in type) {
      const interfaceResolvers = type.getInterfaces().map(iFace => resolvers[iFace.name]);
      extendedResolvers[typeName] = Object.assign({}, ...interfaceResolvers, typeResolvers);
    } else if (typeResolvers != null) {
      extendedResolvers[typeName] = typeResolvers;
    }
  });

  return extendedResolvers;
}
