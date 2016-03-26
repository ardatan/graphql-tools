import rp from 'request-promise';
import DataLoader from 'dataloader';

import {
  identity,
  range,
  forOwn,
  isArray,
} from 'lodash';

// Encapsulates session management, dataloader caching, and pagination
export class DiscourseContext {
  COOKIE_KEY = '_forum_session';
  TOKEN_KEY = '_t';

  constructor({ loginToken, apiRoot }) {
    this.apiRoot = apiRoot;
    this.loginToken = loginToken;

    this.urlDataLoader = new DataLoader((urls) => {
      console.log('Fetching batch:', urls);
      // XXX we probably shouldn't batch requests to the backend for REST.

      const options = {
        json: true,
      };

      if (this.loginToken) {
        options.headers = {
          'Cookie': this.TOKEN_KEY + '=' + this.loginToken,
        };
      }

      return Promise.all(urls.map((url) => {
        return rp({
          uri: url,
          ...options,
        }).catch((err) => {
          console.log(err);
          throw err;
        });
      }));
    });
  }

  getPagesWithParams(url, { page = 0, numPages = 1 }, params = {}) {
    const pageNumbers = range(page, page + numPages);

    const urls = pageNumbers.map((pageNumber) => {
      const myParams = {
        page: pageNumber,
        ...params,
      };

      return `${url}?${serializeParamsForRails(myParams)}`;
    });
    const requestPromises = urls.map(myUrl => this.get(myUrl));
    return Promise.all(requestPromises).then((results) => {
      return {
        pages: results.map((result) => {
          return result.topic_list;
        }),
      };
    });
  }

  _fetchEndpoint(endpoint, args) {
    if (endpoint.fetch) {
      return endpoint.fetch(args, this);
    }

    return this.urlDataLoader.load(this.apiRoot + endpoint.url(args))
      .then(endpoint.map || identity);
  }

  get(url) {
    return this.urlDataLoader.load(this.apiRoot + url);
  }

  getForumCookie(res) {
    return res.headers['set-cookie'].filter((cookie) => {
      return cookie.startsWith(this.COOKIE_KEY);
    })[0].split(' ')[0].split('=')[1].split(';')[0];
  }

  getForumToken(res) {
    return res.headers['set-cookie'].filter((cookie) => {
      return cookie.startsWith(this.TOKEN_KEY);
    })[0].split(' ')[0].split('=')[1].split(';')[0];
  }

  // XXX why not just chain the promises?
  getCSRFAndCookieThen(callback) {
    return rp({
      uri: this.apiRoot + '/session/csrf.json',
      json: true,
      resolveWithFullResponse: true,
    }).then((res) => {
      const cookie = this.getForumCookie(res);
      const csrf = res.body.csrf;

      return callback(csrf, cookie);
    });
  }
}

function serializeParamsForRails(paramsObj) {
  const segments = [];

  forOwn(paramsObj, (value, key) => {
    if (isArray(value)) {
      value.forEach((arrayItem) => {
        segments.push(`${encodeURIComponent(key)}[]=${encodeURIComponent(arrayItem)}`);
      });
      return;
    }

    segments.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  });

  return segments.join('&');
}
