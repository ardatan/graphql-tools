import { fetch } from 'cross-fetch';
import { ApolloLink } from 'apollo-link';
import { HttpLink } from 'apollo-link-http';
import { linkToExecutor } from '@graphql-tools/links';
import { introspectSchema } from '@graphql-tools/wrap';

const retrieveCacheHintLink = new ApolloLink((operation, forward) => {
  return forward(operation).map(response => {
    const context = operation.getContext();

    if (context.graphqlContext) {
      const cacheControl = context.response.headers.get('Cache-Control');
      console.log('cache: ', cacheControl);

      if (cacheControl) {
        if (!context.graphqlContext.cacheControl || !Array.isArray(context.graphqlContext.cacheControl)) {
          context.graphqlContext.cacheControl = [];
        }

        context.graphqlContext.cacheControl.push(cacheControl);
      }
    }

    return response;
  });
});

export default async remoteUrl => {
  console.log('url: ', remoteUrl);
  const link = ApolloLink.from([retrieveCacheHintLink, new HttpLink({ uri: remoteUrl, fetch })]);
  const executor = linkToExecutor(link);
  const schema = await introspectSchema(executor);

  return { schema, executor };
};
