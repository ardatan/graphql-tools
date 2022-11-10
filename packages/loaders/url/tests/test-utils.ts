import { isAsyncIterable, inspect } from '@graphql-tools/utils';
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs';
import { makeExecutableSchema } from '@graphql-tools/schema';

export function assertAsyncIterable(input: unknown): asserts input is AsyncIterable<any> {
  if (!isAsyncIterable(input)) {
    throw new Error(`Expected AsyncIterable. but received: ${inspect(input)}`);
  }
}

export function assertNonMaybe<T>(input: T): asserts input is Exclude<T, null | undefined> {
  if (input == null) {
    throw new Error('Value should be neither null nor undefined.');
  }
}

export function sleep<T = void>(
  ms: number,
  onTimeout: (timeout: NodeJS.Timeout) => T = () => {
    return undefined as T;
  }
) {
  return new Promise(resolve => onTimeout(setTimeout(resolve, ms)));
}

export const testTypeDefs = /* GraphQL */ `
schema { query: CustomQuery
mutation: Mutation
subscription: Subscription }
"""The \`Upload\` scalar type represents a file upload."""
scalar Upload
"""Test type comment"""
type CustomQuery {
  """Test field comment"""
  a(testVariable: String): String

  complexField(complexArg: ComplexInput): ComplexType
}

input ComplexInput {
  id: ID
}

input ComplexChildInput {
  id: ID
}

type ComplexType {
  id: ID
  complexChildren(complexChildArg: ComplexChildInput): [ComplexChild]
}

type ComplexChild {
  id: ID
}

type Mutation {
  uploadFile(file: Upload, dummyVar: TestInput, secondDummyVar: String): File
}
type File {
  filename: String
  mimetype: String
  encoding: String
  content: String
}
type Subscription {
  testMessage: TestMessage
}
type TestMessage {
  number: Int
}
input TestInput {
  testField: String
}
`.trim();

export const testResolvers = {
  CustomQuery: {
    a: (_: never, { testVariable }: { testVariable: string }) => testVariable || 'a',
    complexField: (_: never, { complexArg }: { complexArg: { id: string } }) => {
      return complexArg;
    },
  },
  ComplexType: {
    complexChildren: (_: never, { complexChildArg }: { complexChildArg: { id: string } }) => {
      return [{ id: complexChildArg.id }];
    },
  },
  Upload: GraphQLUpload,
  File: {
    content: async (file: any) => {
      const stream: NodeJS.ReadableStream = file.createReadStream();
      let data = '';
      for await (const chunk of stream) {
        data += chunk;
      }
      return data;
    },
  },
  Mutation: {
    uploadFile: async (_: never, { file }: any) => file,
  },
  Subscription: {
    testMessage: {
      subscribe: async function* () {
        for (let i = 0; i < 3; i++) {
          yield { number: i };
        }
      },
      resolve: (payload: any) => payload,
    },
  },
};

export const testSchema = makeExecutableSchema({ typeDefs: testTypeDefs, resolvers: testResolvers });

export const testHost = `http://localhost:3000`;
export const testPath = '/graphql';
export const testUrl = `${testHost}${testPath}`;
