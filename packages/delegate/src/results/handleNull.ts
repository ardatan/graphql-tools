import { GraphQLError } from 'graphql';
import AggregateError from 'aggregate-error';

export function handleNull(errors: Array<GraphQLError>) {
  if (errors.length) {
    if (errors.length > 1) {
      return new AggregateError(errors);
    }

    return errors[0];
  }

  return null;
}
