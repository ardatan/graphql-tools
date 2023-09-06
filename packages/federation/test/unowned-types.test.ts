import { promises as fs } from 'fs';
import { join } from 'path';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';

describe('Unowned types', () => {
  it('works', async () => {
    const supergraphSdl = await fs.readFile(
      join(__dirname, 'fixtures/unowned-types/supergraph.graphql'),
      'utf-8',
    );
    const stitchedSchema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl,
    });
    const printedSchema = printSchemaWithDirectives(stitchedSchema);
    expect(printedSchema.trim()).toMatchSnapshot();
  });
});
