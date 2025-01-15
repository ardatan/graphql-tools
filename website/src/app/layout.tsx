import { FC, ReactNode } from 'react';
import { GitHubIcon, PaperIcon, PencilIcon, PRODUCTS } from '@theguild/components';
import { getDefaultMetadata, getPageMap, GuildLayout } from '@theguild/components/server';
import '@theguild/components/style.css';
import { pageMap as changelogsPageMap } from './changelogs/[...slug]/page';

const description = PRODUCTS.TOOLS.title;
const websiteName = 'GraphQL-Tools';

export const metadata = getDefaultMetadata({
  description,
  websiteName,
  productName: 'TOOLS',
});

const RootLayout: FC<{
  children: ReactNode;
}> = async ({ children }) => {
  let [meta, ...pageMap] = await getPageMap();
  pageMap = [
    {
      data: {
        // @ts-expect-error -- always MetaItem
        ...meta.data,
        changelogs: { type: 'page', title: 'Changelogs', theme: { layout: 'full' } },
      },
    },
    ...pageMap,
    { route: '/changelogs', name: 'changelogs', children: changelogsPageMap },
  ];
  return (
    <GuildLayout
      websiteName={websiteName}
      description={description}
      logo={<PRODUCTS.TOOLS.logo className="text-md" />}
      layoutProps={{
        docsRepositoryBase: 'https://github.com/ardatan/graphql-tools/tree/master/website',
      }}
      pageMap={pageMap}
      navbarProps={{
        developerMenu: [
          {
            href: '/docs',
            icon: <PaperIcon />,
            children: 'Documentation',
          },
          { href: 'https://the-guild.dev/blog', icon: <PencilIcon />, children: 'Blog' },
          {
            href: 'https://github.com/ardatan/graphql-tools',
            icon: <GitHubIcon />,
            children: 'GitHub',
          },
          {
            href: '/changelogs',
            icon: null,
            children: 'Changelog',
          },
        ],
      }}
      lightOnlyPages={['/']}
    >
      {children}
    </GuildLayout>
  );
};

export default RootLayout;
