import { HeroGradient, InfoList } from '@theguild/components';

import { handlePushRoute } from '@guild-docs/client';

import { Heading, HStack } from '@chakra-ui/react';
import Image from 'next/image';
import GraphQLIcon from '../../public/assets/graphql.svg';
import NeedleIcon from '../../public/assets/needle.svg';
import FlaskIcon from '../../public/assets/flask.svg';

function FeatureTitle({ imgSrc, title }: { imgSrc: any; title: string }) {
  return (
    <HStack>
      <Image src={imgSrc} width="50px" height="50px" />
      <Heading fontSize="1em">{title}</Heading>
    </HStack>
  );
}

export default function Index() {
  return (
    <>
      <HeroGradient
        title="A set of utilities for faster development of GraphQL Schemas"
        description="GraphQL Tools is an npm package and an opinionated structure for how to build a GraphQL schema and resolvers in JavaScript, following the GraphQL-first development workflow."
        link={{
          children: 'Get Started',
          title: 'Learn more about GraphQL Tools',
          href: '/docs/introduction',
          onClick: e => handlePushRoute('/docs/introduction', e),
        }}
        colors={['#000246', '#184BE6']}
      />

      <InfoList
        items={[
          {
            title: <FeatureTitle imgSrc={GraphQLIcon} title="GraphQL-first philosophy" />,
            description:
              'Use the GraphQL schema definition language to generate a schema with full support for resolvers, interfaces, unions, and custom scalars.',
            link: {
              href: '/docs/generate-schema',
              onClick: e => handlePushRoute('/docs/generate-schema', e),
              title: 'Read more',
              children: 'Read more',
            },
          },
          {
            title: <FeatureTitle imgSrc={FlaskIcon} title="Mock your GraphQL API" />,
            description:
              'With GraphQL Tools, you can mock your GraphQL API with fine-grained per-type mocking for fast prototyping without any datasources.',
            link: {
              href: '/docs/mocking',
              onClick: e => handlePushRoute('/docs/mocking', e),
              title: 'Read more',
              children: 'Read more',
            },
          },
          {
            title: <FeatureTitle imgSrc={NeedleIcon} title="Stitch multiple schemas" />,
            description:
              'Automatically stitch multiple schemas together into one larger API in a simple, fast and powerful way.',
            link: {
              href: '/docs/schema-stitching',
              onClick: e => handlePushRoute('/docs/schema-stitching', e),
              title: 'Read more',
              children: 'Read more',
            },
          },
        ]}
      />
    </>
  );
}
