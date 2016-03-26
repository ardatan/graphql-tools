
import {
  forIn,
} from 'lodash';

import rp from 'request-promise';

import { DiscourseContext } from './discourse-context';

const API_ROOT = 'https://meta.discourse.org';

const resourceTypes = {
  posts: {
    typeName: 'Post',
    indexEndpoint: {
      url: () => '/posts',
      map: (data) => data.latest_posts,
    },
    showEndpoint: {
      url: ({ id }) => `/posts/${id}`,
    },
  },
  topics: {
    typeName: 'Topic',
    showEndpoint: {
      url: ({ id }) => `/t/${id}`,
    },
  },
  categories: {
    typeName: 'Category',
    indexEndpoint: {
      url: () => '/categories',
      // XXX oh god this endpoint returns different data than the single category one below
      map: (data) => data.category_list.categories,
    },
    showEndpoint: {
      // XXX categories is the only type endpoint that provides a fetch. why?
      fetch: ({ id }) => {
        throw new Error(`fetch/get is not defined! id:${id}`);
        // return get(`/c/${id}/show`).then(results => results.category);
      },
    },
  },
};

function reference({ typeKey, id }) {
  return (root, _, context) => {
    return context.rootValue.loadContext._fetchEndpoint(
      resourceTypes[typeKey].showEndpoint,
      { id: id(root) },
    );
  };
}

const singletons = {
  // XXX these are all virtually identical, we can generate them
  latest: {
    endpoint: {
      fetch: (args, loadContext) => {
        return loadContext.getPagesWithParams('/latest', args);
      },
    },
  },
  unread: {
    endpoint: {
      fetch: (args, loadContext) => {
        return loadContext.getPagesWithParams('/unread', args);
      },
    },
  },
  new: {
    endpoint: {
      fetch: (args, loadContext) => {
        return loadContext.getPagesWithParams('/new', args);
      },
    },
  },
  top: {
    endpoint: {
      fetch: (args, loadContext) => {
        const url = args.period ? `/top/${args.period}` : '/top';
        return loadContext.getPagesWithParams(url, args);
      },
    },
  },
};

function makeAuthenticatedQueryResolvers() {
  const plural = {};
  forIn(resourceTypes, (info) => {
    if (! info.indexEndpoint) {
      return null;
    }

    plural[`all${info.typeName}s`] = (_, args, context) => {
      return context.rootValue.loadContext._fetchEndpoint(info.indexEndpoint, args);
    };
  });

  const singular = {};
  forIn(resourceTypes, (info) => {
    if (! info.showEndpoint) {
      return null;
    }

    singular[`one${info.typeName}`] = (_, args, context) => {
      return context.rootValue.loadContext._fetchEndpoint(info.showEndpoint, args);
    };
  });

  const singletonQueries = {};
  forIn(singletons, (info, name) => {
    singletonQueries[name] = (_, args, context) => {
      return context.rootValue.loadContext._fetchEndpoint(info.endpoint, args);
    };
  });

  return {
    ...plural,
    ...singular,
    ...singletonQueries,
  };
}

const resolvers = {
  Post: {
    topic: reference({
      typeKey: 'topics',
      id: ({ topic_id }) => topic_id,
    }),
  },

  Topic: {
    category: reference({
      typeKey: 'categories',
      id: ({ category_id }) => category_id,
    }),
  },

  Category: {
    latest_topics: (category, args, context) => {
      return context.rootValue.loadContext.getPagesWithParams(`/c/${category.id}`, args);
    },
    new_topics: (category, args, context) => {
      return context.rootValue.loadContext.getPagesWithParams(
        `/c/${category.id}/l/new`,
        args,
      );
    },
  },

  AuthenticatedQuery: makeAuthenticatedQueryResolvers(),

  RootQuery: {
    root: (_, args, context) => {
      context.rootValue.loadContext = new DiscourseContext({
        loginToken: args.token,
        apiRoot: API_ROOT,
      });
      return {};
    },
  },

  // TODO this is waaaaay too long.
  RootMutation: {
    login: (_, args, context) => {
      context.rootValue.loadContext = new DiscourseContext({
        apiRoot: API_ROOT,
      });

      // XXX maybe this could just be in discourse-context.js, in a method
      // called: getLoginToken( username, pw)
      return context.rootValue.loadContext.getCSRFAndCookieThen((csrf, cookie) => {
        return rp({
          method: 'POST',
          uri: `${API_ROOT}/session.json`,
          form: {
            login: args.username,
            password: args.password,
          },
          headers: {
            'X-CSRF-Token': csrf,
            Cookie: `${context.rootValue.loadContext.COOKIE_KEY}=${cookie}`,
          },
          json: true,
          resolveWithFullResponse: true,
        });
      }).then((res) => {
        if (res.body.error) {
          throw new Error(res.body.error);
        }

        const token = context.rootValue.loadContext.getForumToken(res);
        return token;
      }).catch((err) => {
        throw err;
      });
    },
  },
};

export default resolvers;
