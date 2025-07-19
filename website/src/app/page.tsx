import { ReactNode } from 'react';
import Image from 'next/image';
import {
  ArrowIcon,
  CallToAction,
  CheckIcon,
  cn,
  DecorationIsolation,
  GitHubIcon,
  Heading,
  InfoCard,
  TextLink,
  ToolsAndLibrariesCards,
  ToolsLogo,
} from '@theguild/components';
import { metadata as rootMetadata } from './layout';
import arrowUpBade from './icons/arrow-up-badge.svg';
import graphqlBadge from './icons/graphql-badge.svg';
import plugZapBadge from './icons/plug-zap-badge.svg';

export const metadata = {
  title: 'GraphQL Tools',
  alternates: {
    // to remove leading slash
    canonical: '.',
  },
  openGraph: {
    ...rootMetadata.openGraph,
    // to remove leading slash
    url: '.',
  },
};

function Hero(props: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative isolate flex max-w-[90rem] flex-col items-center justify-center gap-6 overflow-hidden rounded-3xl bg-blue-400 px-4 py-6 sm:py-12 md:gap-8 lg:py-24',
        props.className,
      )}
    >
      <DecorationIsolation className="-z-10">
        <ToolsLogo
          className={cn(
            'absolute right-[-180px] top-[calc(50%-180px)] size-[360px] fill-[url(#codegen-hero-gradient)] stroke-white/10 stroke-[0.1px] md:hidden xl:block',
            'lg:left-[-250px] lg:top-1/2 lg:size-[500px] lg:-translate-y-1/2',
          )}
        />
        <ToolsLogo className="absolute right-[-150px] top-2 size-[672px] fill-[url(#codegen-hero-gradient)] stroke-white/10 stroke-[0.1px] max-md:hidden" />
        <svg>
          <defs>
            <linearGradient id="codegen-hero-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="11.66%" stopColor="rgba(255, 255, 255, 0.10)" />
              <stop offset="74.87%" stopColor="rgba(255, 255, 255, 0.30)" />
            </linearGradient>
          </defs>
        </svg>
      </DecorationIsolation>
      {props.children}
    </div>
  );
}

function HeroLinks(props: { children: ReactNode }) {
  return (
    <div className="relative z-10 flex justify-center gap-2 px-0.5 max-sm:flex-col sm:gap-4">
      {props.children}
    </div>
  );
}

function HeroFeatures(props: { children: ReactNode }) {
  return (
    <ul className="mx-auto flex list-none gap-x-6 gap-y-2 text-sm font-medium max-md:flex-col [&>li]:flex [&>li]:items-center [&>li]:gap-2">
      {props.children}
    </ul>
  );
}

export default function MyPage() {
  return (
    <div className="mx-auto flex h-full max-w-[90rem] flex-col">
      <Hero className="mx-4 max-sm:mt-2 md:mx-6">
        <Heading as="h1" size="xl" className="mx-auto max-w-3xl text-balance text-center">
          A set of utilities for faster GraphQL development
        </Heading>
        <p className="mx-auto w-[512px] max-w-[80%] text-center leading-6 text-green-800">
          A collection of NPM packages that provides a structured approach to building GraphQL
          schemas and resolvers in JavaScript, following{' '}
          <TextLink href="/docs/introduction#the-graphql-first-philosophy">
            the GraphQL-first development workflow
          </TextLink>
          .
        </p>
        <HeroFeatures>
          <li>
            <CheckIcon className="text-green-800" />
            Fully open source
          </li>
          <li>
            <CheckIcon className="text-green-800" />
            No vendor lock
          </li>
        </HeroFeatures>
        <HeroLinks>
          <CallToAction variant="primary-inverted" href="/docs">
            Get started
          </CallToAction>
          <CallToAction
            variant="secondary-inverted"
            href="https://github.com/ardatan/graphql-tools"
          >
            <GitHubIcon className="size-6" />
            GitHub
          </CallToAction>
        </HeroLinks>
      </Hero>

      <FeaturesSection />
      <ToolsAndLibrariesCards className="mx-4 mt-6 md:mx-6" />
    </div>
  );
}

function FeaturesSection({ className }: { className?: string }) {
  return (
    <section className={cn('px-4 py-6 sm:py-12 md:px-6 lg:py-16 xl:px-[120px]', className)}>
      <Heading as="h2" size="md" className="text-balance sm:px-6 sm:text-center">
        Everything GraphQL
      </Heading>
      <ul className="mt-6 flex flex-wrap justify-center gap-2 md:mt-16 md:gap-6">
        <InfoCard
          as="li"
          heading="GraphQL-First Philosophy"
          icon={<Image src={graphqlBadge} alt="" height="22" className="m-2.5" />}
          className="flex-1 rounded-2xl md:rounded-3xl"
        >
          Use the GraphQL schema definition language to generate a schema with full support for
          resolvers, interfaces, unions, and custom scalars.
          <br />
          <TextLink
            href="/docs/introduction#the-graphql-first-philosophy"
            className="mt-4 text-green-800"
          >
            Learn more
            <ArrowIcon />
          </TextLink>
        </InfoCard>
        <InfoCard
          as="li"
          heading="Mock Your GraphQL API"
          icon={<Image src={arrowUpBade} alt="" />}
          className="flex-1 basis-full rounded-2xl md:basis-0 md:rounded-3xl"
        >
          With GraphQL Tools, you can mock your GraphQL API with fine-grained per-type mocking for
          fast prototyping without any datasources.
          <br />
          <TextLink href="/docs/mocking" className="mt-4 text-green-800">
            Learn more
            <ArrowIcon />
          </TextLink>
        </InfoCard>
        <InfoCard
          as="li"
          heading="Stitch Multiple Schemas"
          icon={<Image src={plugZapBadge} alt="" height="26" className="m-2" />}
          className="flex-1 basis-full rounded-2xl md:rounded-3xl lg:basis-0"
        >
          Automatically stitch multiple schemas together into one larger API in a simple, fast and
          powerful way.
          <br />
          <TextLink href="https://the-guild.dev/graphql/stitching" className="mt-4 text-green-800">
            Learn more
            <ArrowIcon />
          </TextLink>
        </InfoCard>
      </ul>
    </section>
  );
}
