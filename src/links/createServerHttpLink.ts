import { ApolloLink, Observable, RequestHandler, fromError } from 'apollo-link';
import {
  serializeFetchParameter,
  selectURI,
  parseAndCheckHttpResponse,
  selectHttpOptionsAndBody,
  createSignalIfSupported,
  fallbackHttpConfig,
  Body,
  HttpOptions,
  UriFunction,
} from 'apollo-link-http-common';
import { DefinitionNode } from 'graphql';
import { extractFiles, isExtractableFile as defaultIsExtractableFile } from 'extract-files';
import KnownLengthFormData, { AppendOptions } from 'form-data';
import fetch from 'node-fetch';

class FormData extends KnownLengthFormData {
  private hasUnknowableLength: boolean;

  constructor(options?: any) {
    super(options);
    this.hasUnknowableLength = false;
  }

  public append(key: string, value: any, options?: AppendOptions | string): void {
    options = options || {};

    // allow filename as single option
    if (typeof options === 'string') {
      options = {filename: options};
    }

    // empty or either doesn't have path or not an http response
    if (
      !options.knownLength &&
      !Buffer.isBuffer(value) &&
      typeof value !== 'string' &&
      !value.path &&
      !(value.readable && value.hasOwnProperty('httpVersion'))
    ) {
      this.hasUnknowableLength = true;
    }

    super.append(key, value, options);
  }

  public getLength(callback: (err: Error | null, length: number) => void): void {
    if (this.hasUnknowableLength) {
      return null;
    }

    return super.getLength(callback);
  }

  public getLengthSync(): number {
    if (this.hasUnknowableLength) {
      return null;
    }

    return super.getLengthSync();
  }
}

export namespace HttpLink {
  //TODO Would much rather be able to export directly
  // tslint:disable-next-line: no-shadowed-variable
  export interface Function extends UriFunction {}
  export interface Options extends HttpOptions {
    /**
     * If set to true, use the HTTP GET method for query operations. Mutations
     * will still use the method specified in fetchOptions.method (which defaults
     * to POST).
     */
    useGETForQueries?: boolean;
    serializer?: (method: string) => any;
    appendFile?: (form: FormData, index: string, file: File) => void;
  }
}

// For backwards compatibility.
export import FetchOptions = HttpLink.Options;
export import UriFunction = HttpLink.Function;
import { Readable } from 'stream';

interface File {
  createReadStream?: () => Readable;
  filename?: string;
  mimetype?: string;
  name?: string;
}

export const createServerHttpLink = (linkOptions: HttpLink.Options = {}) => {
  let {
    uri = '/graphql',
    fetch: customFetch = fetch as unknown as WindowOrWorkerGlobalScope['fetch'],
    serializer: customSerializer = defaultSerializer,
    appendFile: customAppendFile = defaultAppendFile,
    includeExtensions,
    useGETForQueries,
    ...requestOptions
  } = linkOptions;

  const linkConfig = {
    http: { includeExtensions },
    options: requestOptions.fetchOptions,
    credentials: requestOptions.credentials,
    headers: requestOptions.headers,
  };

  return new ApolloLink(operation => {
    let chosenURI = selectURI(operation, uri);

    const context = operation.getContext();

    // `apollographql-client-*` headers are automatically set if a
    // `clientAwareness` object is found in the context. These headers are
    // set first, followed by the rest of the headers pulled from
    // `context.headers`. If desired, `apollographql-client-*` headers set by
    // the `clientAwareness` object can be overridden by
    // `apollographql-client-*` headers set in `context.headers`.
    const clientAwarenessHeaders = {};
    if (context.clientAwareness) {
      const { name, version } = context.clientAwareness;
      if (name) {
        clientAwarenessHeaders['apollographql-client-name'] = name;
      }
      if (version) {
        clientAwarenessHeaders['apollographql-client-version'] = version;
      }
    }

    const contextHeaders = { ...clientAwarenessHeaders, ...context.headers };

    const contextConfig = {
      http: context.http,
      options: context.fetchOptions,
      credentials: context.credentials,
      headers: contextHeaders,
    };

    //uses fallback, link, and then context to build options
    const { options, body } = selectHttpOptionsAndBody(
      operation,
      fallbackHttpConfig,
      linkConfig,
      contextConfig,
    );

    let controller: AbortController;
    if (!(options as any).signal) {
      const { controller: _controller, signal } = createSignalIfSupported();
      controller = _controller;
      if (controller) {
        (options as any).signal = signal;
      }
    }

    // If requested, set method to GET if there are no mutations.
    const definitionIsMutation = (d: DefinitionNode) => {
      return d.kind === 'OperationDefinition' && d.operation === 'mutation';
    };
    if (
      useGETForQueries &&
      !operation.query.definitions.some(definitionIsMutation)
    ) {
      options.method = 'GET';
    }

    if (options.method === 'GET') {
      const { newURI, parseError } = rewriteURIForGET(chosenURI, body);
      if (parseError) {
        return fromError(parseError);
      }
      chosenURI = newURI;
    }

    return new Observable(observer => {
      resolvePromises(body, async (object) => {
        if (object instanceof Promise) {
          object = await object;
        }
        return object;
      }).then(resolvedBody => {
        if (options.method !== 'GET') {
          options.body = customSerializer(resolvedBody, customAppendFile);
          if (options.body instanceof FormData) {
            // Automatically set by fetch when the body is a FormData instance.
            delete options.headers['content-type'];
          }
        }
        return options;
      })
        .then(newOptions => customFetch(chosenURI, newOptions))
        .then(response => {
          operation.setContext({ response });
          return response;
        })
        .then(parseAndCheckHttpResponse(operation))
        .then(result => {
          // we have data and can send it to back up the link chain
          observer.next(result);
          observer.complete();
          return result;
        })
        .catch(err => {
          // fetch was cancelled so it's already been cleaned up in the unsubscribe
          if (err.name === 'AbortError') {
            return;
          }
          // if it is a network error, BUT there is graphql result info
          // fire the next observer before calling error
          // this gives apollo-client (and react-apollo) the `graphqlErrors` and `networErrors`
          // to pass to UI
          // this should only happen if we *also* have data as part of the response key per
          // the spec
          if (err.result && err.result.errors && err.result.data) {
            // if we don't call next, the UI can only show networkError because AC didn't
            // get any graphqlErrors
            // this is graphql execution result info (i.e errors and possibly data)
            // this is because there is no formal spec how errors should translate to
            // http status codes. So an auth error (401) could have both data
            // from a public field, errors from a private field, and a status of 401
            // {
            //  user { // this will have errors
            //    firstName
            //  }
            //  products { // this is public so will have data
            //    cost
            //  }
            // }
            //
            // the result of above *could* look like this:
            // {
            //   data: { products: [{ cost: "$10" }] },
            //   errors: [{
            //      message: 'your session has timed out',
            //      path: []
            //   }]
            // }
            // status code of above would be a 401
            // in the UI you want to show data where you can, errors as data where you can
            // and use correct http status codes
            observer.next(err.result);
          }
          observer.error(err);
        });

      return () => {
        // XXX support canceling this request
        // https://developers.google.com/web/updates/2017/09/abortable-fetch
        if (controller) {
          controller.abort();
        }
      };
    });
  });
};

// For GET operations, returns the given URI rewritten with parameters, or a
// parse error.
function rewriteURIForGET(chosenURI: string, body: Body) {
  // Implement the standard HTTP GET serialization, plus 'extensions'. Note
  // the extra level of JSON serialization!
  const queryParams: Array<string> = [];
  const addQueryParam = (key: string, value: string) => {
    queryParams.push(`${key}=${encodeURIComponent(value)}`);
  };

  if ('query' in body) {
    addQueryParam('query', body.query);
  }
  if (body.operationName) {
    addQueryParam('operationName', body.operationName);
  }
  if (body.variables) {
    let serializedVariables;
    try {
      serializedVariables = serializeFetchParameter(
        body.variables,
        'Variables map',
      );
    } catch (parseError) {
      return { parseError };
    }
    addQueryParam('variables', serializedVariables);
  }
  if (body.extensions) {
    let serializedExtensions;
    try {
      serializedExtensions = serializeFetchParameter(
        body.extensions,
        'Extensions map',
      );
    } catch (parseError) {
      return { parseError };
    }
    addQueryParam('extensions', serializedExtensions);
  }

  // Reconstruct the URI with added query params.
  // XXX This assumes that the URI is well-formed and that it doesn't
  //     already contain any of these query params. We could instead use the
  //     URL API and take a polyfill (whatwg-url@6) for older browsers that
  //     don't support URLSearchParams. Note that some browsers (and
  //     versions of whatwg-url) support URL but not URLSearchParams!
  let fragment = '',
    preFragment = chosenURI;
  const fragmentStart = chosenURI.indexOf('#');
  if (fragmentStart !== -1) {
    fragment = chosenURI.substr(fragmentStart);
    preFragment = chosenURI.substr(0, fragmentStart);
  }
  const queryParamsPrefix = preFragment.indexOf('?') === -1 ? '?' : '&';
  const newURI =
    preFragment + queryParamsPrefix + queryParams.join('&') + fragment;
  return { newURI };
}

async function resolvePromises(object: any, resolver: ((o: any) => any)): Promise<any> {
  if (!object) {
    return object;
  }

  if (resolver) {
    object = await resolver(object);
  }

  if (Array.isArray(object)) {
    return object.map(async o => await resolvePromises(o, resolver));
  } else if (typeof object === 'object') {
    const keys = Object.keys(object);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      object[key] = await resolvePromises(object[key], resolver);
    }
    return object;
  }

  return object;
}

function defaultSerializer(
  body: any,
  appendFile: (form: FormData, index: string, file: File) => void,
): any {
  const { clone, files } = extractFiles(body, undefined, (value: any) => {
    if (
      defaultIsExtractableFile(value) ||
      (value && value.createReadStream)
    ) {
      return true;
    }
    return false;
  });

  const payload = serializeFetchParameter(clone, 'Payload');

  if (!files.size) {
    return payload;
  }

  // GraphQL multipart request spec:
  // https://github.com/jaydenseric/graphql-multipart-request-spec

  const form = new FormData();

  form.append('operations', payload);

  const map = {};
  let i = 0;

  files.forEach((paths: Array<string>) => {
    map[++i] = paths;
  });

  form.append('map', JSON.stringify(map));

  i = 0;
  files.forEach((paths: Array<string>, file: File) => {
    appendFile(form, (++i).toString(), file);
  });

  return form;
}

function defaultAppendFile(form: FormData, index: string, file: File) {
  if (file.createReadStream) {
    form.append(index, file.createReadStream(), {
      filename: file.filename,
      contentType: file.mimetype,
    });
  } else {
    form.append(index, file, file.name);
  }
}

export class ServerHttpLink extends ApolloLink {
  public requester: RequestHandler;
  constructor(opts?: HttpLink.Options) {
    super(createServerHttpLink(opts).request);
  }
}
