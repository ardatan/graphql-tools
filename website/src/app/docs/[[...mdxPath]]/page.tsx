import { NextPageProps } from '@theguild/components';
import { generateStaticParamsFor, importPage } from '@theguild/components/pages';
import { Giscus } from '../../../giscus';
import { useMDXComponents } from '../../../mdx-components';

export const generateStaticParams = generateStaticParamsFor('mdxPath');

export async function generateMetadata(props: NextPageProps<'...mdxPath'>) {
  const params = await props.params;
  const { metadata } = await importPage(params.mdxPath);
  return metadata;
}

const Wrapper = useMDXComponents().wrapper;

export default async function Page(props: NextPageProps<'...mdxPath'>) {
  const params = await props.params;
  const result = await importPage(params.mdxPath);
  const { default: MDXContent, toc, metadata } = result;
  return (
    <Wrapper
      toc={toc}
      metadata={metadata}
      bottomContent={<Giscus />}
      // Set lower weight for API pages, when 0.3 is set results for `mocking` will be in down
      // https://pagefind.app/docs/weighting/
      data-pagefind-weight={params.mdxPath[0] === 'api' ? '0.3' : undefined}
    >
      <MDXContent {...props} params={params} />
    </Wrapper>
  );
}