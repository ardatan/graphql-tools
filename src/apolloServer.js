// This file only exists for backwards-compatibility

export default function apolloServer() {
  throw new Error('apolloServer has been moved to a separate module. See: https://github.com/apollostack/apollo-server');
}

export { apolloServer };
