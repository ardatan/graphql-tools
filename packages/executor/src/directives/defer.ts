import { DirectiveLocation, GraphQLBoolean, GraphQLDirective, GraphQLNonNull, GraphQLString } from 'graphql';

/**
 * Used to conditionally defer fragments.
 */
export const GraphQLDeferDirective = new GraphQLDirective({
  name: 'defer',
  description: 'Directs the executor to defer this fragment when the `if` argument is true or undefined.',
  locations: [DirectiveLocation.FRAGMENT_SPREAD, DirectiveLocation.INLINE_FRAGMENT],
  args: {
    if: {
      type: new GraphQLNonNull(GraphQLBoolean),
      description: 'Deferred when true or undefined.',
      defaultValue: true,
    },
    label: {
      type: GraphQLString,
      description: 'Unique name',
    },
  },
});
