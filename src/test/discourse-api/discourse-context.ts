/* tslint:disable:no-console */
import * as rp from 'request-promise';
import { DataLoader } from 'dataloader';
import { IncomingMessage } from 'http';

import {
  identity,
  range,
  forOwn,
  isArray,
} from 'lodash';

export interface IPagination {
    page: number;
    numPages: number;
}

export interface IEndpoint {
    url: (args: { [key: string]: any }) => string;
    map: (data: Object) => { [key: string]: any };
    fetch?: (args: { [key: string]: any }, context: DiscourseContext) => { [key: string]: any };
}

export type IResponse = IncomingMessage & {
    body: any,
}

// Encapsulates session management, dataloader caching, and pagination
export class DiscourseContext {
  private COOKIE_KEY = '_forum_session';
  private TOKEN_KEY = '_t';
  private apiRoot: string;
  private loginToken: string;
  private urlDataLoader: DataLoader<string, any>;

  constructor({ loginToken, apiRoot }: { loginToken?: string, apiRoot: string }) {
    this.apiRoot = apiRoot;
    this.loginToken = loginToken;

    this.urlDataLoader = new DataLoader((urls) => {
      console.log('Fetching batch:', urls);
      // XXX we probably shouldn't batch requests to the backend for REST.

      const options = {
        json: true,
        headers: <{ Cookie: string }> undefined,
      };

      if (this.loginToken) {
        options.headers = {
          Cookie: `${this.TOKEN_KEY}=${this.loginToken}`,
        };
      }

      return Promise.all(urls.map((url) => (
        // console.log(`requesting ${url}, Cookie: ${options.headers.Cookie}`);
        rp((<any> Object).assign({ uri: url }, options)).catch((err: Error) => {
          console.log(err);
          throw err;
        })
      )));
    });
  }

  public getPagesWithParams(url: string,
                            { page = 0, numPages = 1 }: IPagination,
                            params: { [key: string]: any } = {}) {
    const pageNumbers = range(page, page + numPages);

    const urls = pageNumbers.map((pageNumber) => {
      const myParams = (<any> Object).assign({ page: pageNumber }, params);

      return `${url}?${serializeParamsForRails(myParams)}`;
    });
    const requestPromises = urls.map(myUrl => this.get(myUrl));
    return Promise.all(requestPromises).then(results => ({
      pages: results.map(result => result.topic_list),
    }));
  }

  // XXX if I ask for 100 pages but there are only 50, should I still get 100?
  public getPaginatedPosts(posts: string[],
                           { page = 0, numPages = 1 }: IPagination,
                           topicId: string) {
    const pages: Array<Promise<Object> | Object> = [];
    const PPP = 10; // Posts Per Page
    let postsOnPage: string[] = [];
    let offset = 0;
    for (let i = 0; i < numPages; i++) {
      offset = page * PPP + i * PPP;
      postsOnPage = posts.slice(offset, offset + PPP);
      pages.push(this.getPostList(postsOnPage, topicId));
    }
    return pages;
  }

  // XXX could also just use the onePost endpoint to fetch each individual post,
  // in that case we don't need the topicId
  public getPostList(postIDs: string[], topicId: string): Object | Promise<Object> {
    if (postIDs.length === 0) {
      return { posts: [] };
    }
    const params = {};
    params['post_ids'] = postIDs;
    const path = `/t/${topicId}/posts.json`;
    const url = `${path}?${serializeParamsForRails(params)}`;
    return this.get(url)
      .then(result => ({ posts: result.post_stream.posts }))
      .catch(err => {
        console.log('Error fetching page', err);
        return null;
      });
  }

  public get(url: string) {
    return this.urlDataLoader.load(this.apiRoot + url);
  }

  public createPost(args: { [key: string]: any }) {
    return this.getCSRFAndCookieThen((csrf, cookie) => (
      rp({
        method: 'POST',
        uri: `${this.apiRoot}/posts`,
        form: (<any> Object).assign({}, args, {
          archetype: 'regular',
          nested_post: true,
          is_warning: false,
          typing_duration_msecs: 5000,
          composer_open_duration_msecs: 10000,
        }),
        headers: {
          'X-CSRF-Token': csrf,
          Cookie: `${this.COOKIE_KEY}=${cookie}; ${this.TOKEN_KEY}=${this.loginToken}`,
        },
        json: true,
        resolveWithFullResponse: true,
      })
    )).then((res: IResponse) => {
      if (res.body.error) {
        throw new Error(res.body.error);
      }
      return res.body.post;
    }).catch((err) => {
      throw err;
    });
  }

  public getLoginToken(username: string, password: string) {
    return this.getCSRFAndCookieThen((csrf, cookie) => (
      rp({
        method: 'POST',
        uri: `${this.apiRoot}/session.json`,
        form: {
          login: username,
          password,
        },
        headers: {
          'X-CSRF-Token': csrf,
          Cookie: `${this.COOKIE_KEY}=${cookie}`,
        },
        json: true,
        resolveWithFullResponse: true,
      })
    )).then((res: IResponse) => {
      if (res.body.error) {
        throw new Error(res.body.error);
      }

      const token = this.getForumToken(res);
      return token;
    }).catch((err) => {
      throw err;
    });
  }

  public getForumCookie(res: IResponse) {
    return res.headers['set-cookie']
      .filter((cookie: string) => cookie.startsWith(this.COOKIE_KEY))[0]
      .split(' ')[0]
      .split('=')[1]
      .split(';')[0];
  }

  public getForumToken(res: IResponse) {
    return res.headers['set-cookie']
      .filter((cookie: string) => cookie.startsWith(this.TOKEN_KEY))[0]
      .split(' ')[0]
      .split('=')[1]
      .split(';')[0];
  }

  public _fetchEndpoint(endpoint: IEndpoint,
                        args: { [key: string]: any }): { [key: string]: any } {
    if (endpoint.fetch) {
      return endpoint.fetch(args, this);
    }

    return this.urlDataLoader.load(this.apiRoot + endpoint.url(args))
      .then(endpoint.map || identity);
  }

  // XXX why not just chain the promises?
  private getCSRFAndCookieThen(callback: (csrf: string, cookie: string) => any): Promise<any> {
    return rp({
      uri: `${this.apiRoot}/session/csrf.json`,
      json: true,
      resolveWithFullResponse: true,
    }).then((res: IResponse) => {
      const cookie = this.getForumCookie(res);
      const csrf = res.body.csrf;

      return callback(csrf, cookie);
    });
  }
}

function serializeParamsForRails(paramsObj: { [key: string]: string | string[] }): string {
  const segments: string[] = [];

  forOwn(paramsObj, (value, key) => {
    if (isArray(value)) {
      value.forEach((arrayItem: string) => {
        segments.push(`${encodeURIComponent(key)}[]=${encodeURIComponent(arrayItem)}`);
      });
      return;
    }

    segments.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  });

  return segments.join('&');
}
