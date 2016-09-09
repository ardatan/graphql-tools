import { DiscourseContext } from './discourse-context';

const API_ROOT = 'https://meta.discourse.org';

// resolver for posts in Topic
// resolvers for pages PaginatedPostsList
// resolver for posts in PostListPage

const resolvers = {
  Post: {
    topic: (root: any, args: { [key: string]: any }, context: any) => (
      context.rootValue.loadContext._fetchEndpoint(
        { url: ({ id }: { id: string }) => `/t/${id}` },
        { id: root.topic_id }
      )
    ),
  },

  Topic: {
    /* category: reference({
      typeKey: 'categories',
      id: ({ category_id }) => category_id,
    }), */
    category: () => { throw new Error('No endpoint defined to fetch one cat'); },
    posts: (root: any, args: { [key: string]: any }, context: any) => (
      context.rootValue.loadContext._fetchEndpoint({
        url: ({ id }: { id: string }) => `/t/${id}.json`,
        map: (data: any) => ({ posts: data.post_stream.stream, topicId: data.id }),
      }, { id: root.id })
    ),
  },

  PaginatedPostList: {
    pages: ({ posts, topicId }: { posts: string[], topicId: string },
            args: { [key: string]: any },
            context: any) => (
      // XXX I don't like having to pass the topic id through. it's messy
      context.rootValue.loadContext.getPaginatedPosts(posts, args, topicId)
    ),
  },

  /* PostListPage: {
    posts: (root) => {
      console.log('PAGE', root);
      return root;
    },
  }, */

  Category: {
    latest_topics: (category: { id: string }, args: { [key: string]: any }, context: any) => (
      context.rootValue.loadContext.getPagesWithParams(`/c/${category.id}`, args)
    ),
    new_topics: (category: { id: string }, args: { [key: string]: any }, context: any) => (
      context.rootValue.loadContext.getPagesWithParams(
        `/c/${category.id}/l/new`,
        args,
      )
    ),
  },

  PaginatedTopicList: {
    pages() {
      throw new Error('Not implemented');
    },
  },

  TopicListPage: {
    topics() {
      throw new Error('Not implemented');
    },
  },

  PostListPage: {
    posts() {
      throw new Error('Not implemented');
    },
  },

  AuthenticatedQuery: {
    latest: (_: any, args: { [key: string]: any }, context: any) => context.rootValue.loadContext.getPagesWithParams('/latest', args),
    // unread doesn't work? returns empty array...
    unread: (_: any, args: { [key: string]: any }, context: any) => context.rootValue.loadContext.getPagesWithParams('/unread', args),
    new: (_: any, args: { [key: string]: any }, context: any) => context.rootValue.loadContext.getPagesWithParams('/new', args),
    top: (_: any, args: { [key: string]: any }, context: any) => {
      const url = args['period'] ? `/top/${args['period']}` : '/top';
      return context.rootValue.loadContext.getPagesWithParams(url, args);
    },

    // I assume this doesn't actually work. It takes no arguments
    allPosts: (_: any, args: { [key: string]: any }, { rootValue }: { rootValue: any }) => (
      rootValue.loadContext._fetchEndpoint({
        url: '/posts',
        map: (data: any) => data.latest_posts,
      }, args)
    ),
    /* allTopics: (_: any, args: { [key: string]: any }, { rootValue }) => {
      rootValue.loadContext._fetchEndpoint(info.indexEndpoint, args);
    }, */
    // I assume this doesn't actually work. It takes no arguments ...
    allCategories: (_: any, args: { [key: string]: any }, { rootValue }: { rootValue: any }) => (
      rootValue.loadContext._fetchEndpoint({
        url: '/categories',
        map: (data: any) => data.category_list.categories,
      }, args)
    ),
    allTopics() {
      throw new Error('AuthenticatedQuery.oneCategory not implemented');
    },

    onePost: (_: any, args: { [key: string]: any }, context: any) => (
      context.rootValue.loadContext._fetchEndpoint({
        url: ({ id }: { id: string }) => `/posts/${id}`,
      }, args)
    ),
    oneTopic: (_: any, args: { [key: string]: any }, context: any) => (
      context.rootValue.loadContext._fetchEndpoint({
        url: ({ id }: { id: string }) => `/t/${id}`,
      }, args)
    ),
    oneCategory() {
      throw new Error('AuthenticatedQuery.oneCategory not implemented');
    },
    // oneCategory: null, // this isn't actually defined, I think.
  },

  RootQuery: {
    root: (_: any, args: { [key: string]: any }, context: any) => {
      context.rootValue.loadContext = new DiscourseContext({
        loginToken: args['token'],
        apiRoot: API_ROOT,
      });
      return {};
    },
  },

  // TODO this is waaaaay too long.
  RootMutation: {
    login: (_: any, args: { [key: string]: any }, context: any) => {
      context.rootValue.loadContext = new DiscourseContext({
        apiRoot: API_ROOT,
      });

      return context.rootValue.loadContext.getLoginToken(args['username'], args['password']);
    },

    createPost: (_: any, args: { [key: string]: any }, context: any) => {
      context.rootValue.loadContext = new DiscourseContext({
        loginToken: args['token'],
        apiRoot: API_ROOT,
      });

      delete args['token'];
      return context.rootValue.loadContext.createPost(args);
    },
  },
};

export default resolvers;
