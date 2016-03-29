import { DiscourseContext } from './discourse-context';

const API_ROOT = 'https://meta.discourse.org';

// resolver for posts in Topic
// resolvers for pages PaginatedPostsList
// resolver for posts in PostListPage

const resolvers = {
  Post: {
    topic: (root, args, context) => {
      return context.rootValue.loadContext._fetchEndpoint({
        url: ({ id }) => `/t/${id}`,
      }, { id: root.topic_id });
    },
  },

  Topic: {
    /* category: reference({
      typeKey: 'categories',
      id: ({ category_id }) => category_id,
    }), */
    category: () => { throw new Error('No endpoint defined to fetch one cat'); },
    posts: (root, args, context) => {
      return context.rootValue.loadContext._fetchEndpoint({
        url: ({ id }) => `/t/${id}.json`,
        map: (data) => ({ posts: data.post_stream.stream, topicId: data.id }),
      }, { id: root.id });
    },

  },

  PaginatedPostList: {
    pages: ({ posts, topicId }, args, context) => {
      // XXX I don't like having to pass the topic id through. it's messy
      return context.rootValue.loadContext.getPaginatedPosts(posts, args, topicId);
    },
  },

  /* PostListPage: {
    posts: (root) => {
      console.log('PAGE', root);
      return root;
    },
  }, */

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

  AuthenticatedQuery: {
    latest: (_, args, context) => {
      return context.rootValue.loadContext.getPagesWithParams('/latest', args);
    },
    // unread doesn't work? returns empty array...
    unread: (_, args, context) => {
      return context.rootValue.loadContext.getPagesWithParams('/unread', args);
    },
    new: (_, args, context) => {
      return context.rootValue.loadContext.getPagesWithParams('/new', args);
    },
    top: (_, args, context) => {
      const url = args.period ? `/top/${args.period}` : '/top';
      return context.rootValue.loadContext.getPagesWithParams(url, args);
    },

    // I assume this doesn't actually work. It takes no arguments
    allPosts: (_, args, { rootValue }) => {
      return rootValue.loadContext._fetchEndpoint({
        url: '/posts',
        map: (data) => data.latest_posts,
      }, args);
    },
    /* allTopics: (_, args, { rootValue }) => {
      rootValue.loadContext._fetchEndpoint(info.indexEndpoint, args);
    }, */
    // I assume this doesn't actually work. It takes no arguments ...
    allCategories: (_, args, { rootValue }) => {
      return rootValue.loadContext._fetchEndpoint({
        url: '/categories',
        map: (data) => data.category_list.categories,
      }, args);
    },

    onePost: (_, args, context) => {
      return context.rootValue.loadContext._fetchEndpoint({
        url: ({ id }) => `/posts/${id}`,
      }, args);
    },
    oneTopic: (_, args, context) => {
      return context.rootValue.loadContext._fetchEndpoint({
        url: ({ id }) => `/t/${id}`,
      }, args);
    },
    // oneCategory: null, // this isn't actually defined, I think.
  },

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

      return context.rootValue.loadContext.getLoginToken(args.username, args.password);
    },

    createPost: (_, args, context) => {
      context.rootValue.loadContext = new DiscourseContext({
        loginToken: args.token,
        apiRoot: API_ROOT,
      });

      delete args.token;
      return context.rootValue.loadContext.createPost(args);
    },
  },
};

export default resolvers;
