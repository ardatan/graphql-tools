
import {
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
} from 'graphql';

import {
  forIn,
} from 'lodash';

import rp from 'request-promise';

import { DiscourseContext } from './discourse-context';

const API_ROOT = 'https://meta.discourse.org';

const resourceTypes = {
  posts: {
    indexEndpoint: {
      url: () => '/posts',
      map: (data) => data.latest_posts,
    },
    showEndpoint: {
      args: {
        id: { type: GraphQLInt },
      },
      url: ({ id }) => `/posts/${id}`,
    },
  },
  topics: {
    showEndpoint: {
      args: {
        id: { type: GraphQLInt },
      },
      url: ({ id }) => `/t/${id}`,
    },
  },
  categories: {
    indexEndpoint: {
      url: () => '/categories',
      // XXX oh god this endpoint returns different data than the single category one below
      map: (data) => data.category_list.categories,
    },
    showEndpoint: {
      args: {
        id: { type: GraphQLInt },
      },
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

const TopicListPage = new GraphQLObjectType({
  name: 'TopicListPage',
  fields: () => ({
    // XXX page metadata
    topics: { type: new GraphQLList(resourceTypes.topics.graphQLType) },
  }),
});

const PaginatedTopicList = new GraphQLObjectType({
  name: 'PaginatedTopicList',
  fields: () => ({
    pages: {
      type: new GraphQLList(TopicListPage),
    },
  }),
});

const paginationArgs = {
  page: { type: GraphQLInt },
  numPages: { type: GraphQLInt },
};

const singletons = {
  // XXX these are all virtually identical, we can generate them
  latest: {
    endpoint: {
      args: {
        ...paginationArgs,
      },
      fetch: (args, loadContext) => {
        return loadContext.getPagesWithParams('/latest', args);
      },
    },
    graphQLType: PaginatedTopicList,
  },
  unread: {
    endpoint: {
      args: {
        ...paginationArgs,
      },
      fetch: (args, loadContext) => {
        return loadContext.getPagesWithParams('/unread', args);
      },
    },
    graphQLType: PaginatedTopicList,
  },
  new: {
    endpoint: {
      args: {
        ...paginationArgs,
      },
      fetch: (args, loadContext) => {
        return loadContext.getPagesWithParams('/new', args);
      },
    },
    graphQLType: PaginatedTopicList,
  },
  top: {
    endpoint: {
      args: {
        period: { type: TimePeriod },
        ...paginationArgs,
      },
      fetch: (args, loadContext) => {
        const url = args.period ? `/top/${args.period}` : '/top';
        return loadContext.getPagesWithParams(url, args);
      },
    },
    graphQLType: PaginatedTopicList,
  },
};

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
    latestTopics: (category, args, context) => {
      return context.rootValue.loadContext.getPagesWithParams(`/c/${category.id}`, args);
    },
    newTopics: (category, args, context) => {
      return context.rootValue.loadContext.getPagesWithParams(
        `/c/${category.id}/l/new`,
        args,
      );
    },
  },

  AuthenticatedQuery: () => {
    const plural = {};
    forIn(resourceTypes, (info) => {
      if (! info.indexEndpoint) {
        return null;
      }

      plural[`all${info.graphQLType.name}s`] = (_, args, context) => {
        return context.rootValue.loadContext._fetchEndpoint(info.indexEndpoint, args);
      };
    });

    const singular = {};
    forIn(resourceTypes, (info) => {
      if (! info.showEndpoint) {
        return null;
      }

      singular[`one${info.graphQLType.name}`] = (_, args, context) => {
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
  },

  RootQuery: {
    root: (_, args, context) => {
      context.rootValue.loadContext = new DiscourseContext({
        loginToken: args.token,
        apiRoot: API_ROOT,
      });
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
