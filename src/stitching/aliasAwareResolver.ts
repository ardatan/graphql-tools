import { GraphQLFieldResolver } from 'graphql';

const aliasAwareResolver: GraphQLFieldResolver<any, any> = (
  parent,
  args,
  context,
  info,
) => {
  const fieldName = info.fieldNodes[0].alias
    ? info.fieldNodes[0].alias.value
    : info.fieldName;
  if (parent) {
    return parent[fieldName];
  } else {
    return null;
  }
};

export default aliasAwareResolver;
