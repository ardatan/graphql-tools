import { GraphQLScalarType, GraphQLError } from 'graphql';
import isPromise from 'is-promise';

const GraphQLUpload = new GraphQLScalarType({
  name: 'Upload',
  description: 'The `Upload` scalar type represents a file upload.',
  parseValue: value => {
    if (value != null && isPromise(value.promise)) {
      // graphql-upload v10
      return value.promise;
    } else if (isPromise(value)) {
      // graphql-upload v9
      return value;
    }
    throw new GraphQLError('Upload value invalid.');
  },
  // serialization requires to support schema stitching
  serialize: value => value,
  parseLiteral: ast => {
    throw new GraphQLError('Upload literal unsupported.', ast);
  },
});

export { GraphQLUpload };
