import { GraphQLScalarType } from 'graphql';

const GraphQLUpload = new GraphQLScalarType({
  name: 'Upload',
  description: 'The `Upload` scalar type represents a file upload.',
  parseValue: value => value,
  parseLiteral: () => {
    throw new Error('‘Upload’ scalar literal unsupported.');
  },
  serialize: value => value,
});

export { GraphQLUpload };
