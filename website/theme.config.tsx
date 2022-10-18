/* eslint sort-keys: error */
import { defineConfig, Giscus, ToolsLogo, useTheme } from '@theguild/components';
import { useRouter } from 'next/router';

const SITE_NAME = 'GraphQL Tools';

export default defineConfig({
  docsRepositoryBase: 'https://github.com/ardatan/graphql-tools/tree/master/website',
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content={`${SITE_NAME}: documentation`} />
      <meta name="og:title" content={`${SITE_NAME}: documentation`} />
    </>
  ),
  logo: (
    <>
      <ToolsLogo className="mr-1.5 h-9 w-9" />
      <div>
        <h1 className="md:text-md text-sm font-medium">{SITE_NAME}</h1>
        <h2 className="hidden text-xs sm:block">A set of utilities for faster GraphQL development</h2>
      </div>
    </>
  ),
  main: {
    extraContent() {
      const { resolvedTheme } = useTheme();
      const { route } = useRouter();

      if (route === '/') {
        return null;
      }
      return (
        <Giscus
          // ensure giscus is reloaded when client side route is changed
          key={route}
          repo="ardatan/graphql-tools"
          repoId="MDEwOlJlcG9zaXRvcnk1NDQzMjE2OA=="
          category="Docs Discussions"
          categoryId="DIC_kwDOAz6RqM4CSDSV"
          mapping="pathname"
          theme={resolvedTheme}
        />
      );
    },
  },
  titleSuffix: ` – ${SITE_NAME}`,
});
