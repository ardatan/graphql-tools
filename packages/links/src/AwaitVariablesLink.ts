import { Readable } from 'stream';
import * as apolloImport from '@apollo/client';
import { File } from '@whatwg-node/fetch';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

const apollo: typeof apolloImport = (apolloImport as any)?.default ?? apolloImport;

function getFinalPromise(object: any) {
  return handleMaybePromise(
    () => object,
    resolvedObject => {
      if (resolvedObject == null) {
        return resolvedObject;
      }

      if (Array.isArray(resolvedObject)) {
        return Promise.all(resolvedObject.map(o => getFinalPromise(o)));
      } else if (typeof resolvedObject === 'object') {
        if (resolvedObject?.createReadStream != null) {
          const readable: Readable = resolvedObject.createReadStream();
          return readable
            .toArray()
            .then(
              chunks =>
                new File(chunks, resolvedObject.filename, { type: resolvedObject.mimetype }),
            );
        }
        const keys = Object.keys(resolvedObject);
        return Promise.all(keys.map(key => getFinalPromise(resolvedObject[key]))).then(
          awaitedValues => {
            for (let i = 0; i < keys.length; i++) {
              resolvedObject[keys[i]] = awaitedValues[i];
            }
            return resolvedObject;
          },
        );
      }

      return resolvedObject;
    },
  );
}

export class AwaitVariablesLink extends apollo.ApolloLink {
  request(
    operation: apolloImport.ApolloLink.Operation,
    forward: apolloImport.ApolloLink.ForwardFunction,
  ): apolloImport.Observable<apolloImport.ApolloLink.Result> {
    return new apollo.Observable(observer => {
      let subscription: any;
      handleMaybePromise(
        () => getFinalPromise(operation.variables),
        resolvedVariables => {
          operation.variables = resolvedVariables;
          subscription = forward(operation).subscribe({
            next: observer.next.bind(observer),
            error: observer.error.bind(observer),
            complete: observer.complete.bind(observer),
          });
        },
        err => {
          observer.error(err);
        },
      );

      return () => {
        if (subscription != null) {
          subscription.unsubscribe();
        }
      };
    });
  }
}
