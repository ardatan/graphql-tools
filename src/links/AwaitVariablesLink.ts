import {
  ApolloLink,
  Operation,
  NextLink,
  Observable,
  FetchResult,
} from 'apollo-link';

function getFinalPromise(object: any): Promise<any> {
  return Promise.resolve(object).then((resolvedObject) => {
    if (resolvedObject == null) {
      return resolvedObject;
    }

    if (Array.isArray(resolvedObject)) {
      return Promise.all(resolvedObject.map((o) => getFinalPromise(o)));
    } else if (typeof resolvedObject === 'object') {
      const keys = Object.keys(resolvedObject);
      return Promise.all(
        keys.map((key) => getFinalPromise(resolvedObject[key])),
      ).then((awaitedValues) => {
        for (let i = 0; i < keys.length; i++) {
          resolvedObject[keys[i]] = awaitedValues[i];
        }
        return resolvedObject;
      });
    }

    return resolvedObject;
  });
}

class AwaitVariablesLink extends ApolloLink {
  request(operation: Operation, forward: NextLink): Observable<FetchResult> {
    return new Observable((observer) => {
      let subscription: any;
      getFinalPromise(operation.variables)
        .then((resolvedVariables) => {
          operation.variables = resolvedVariables;
          subscription = forward(operation).subscribe({
            next: observer.next.bind(observer),
            error: observer.error.bind(observer),
            complete: observer.complete.bind(observer),
          });
        })
        .catch(observer.error.bind(observer));

      return () => {
        if (subscription != null) {
          subscription.unsubscribe();
        }
      };
    });
  }
}

export { AwaitVariablesLink };
