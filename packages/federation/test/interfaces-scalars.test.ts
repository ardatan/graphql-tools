import { promises as fs } from 'fs';
import { join } from 'path';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';

describe('Interfaces & Scalars', () => {
  it('works', async () => {
    const supergraphSdl = await fs.readFile(
      join(__dirname, 'fixtures/interfaces-scalars/supergraph.graphql'),
      'utf-8',
    );
    const stitchedSchema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl,
    });
    const printedSchema = printSchemaWithDirectives(stitchedSchema);
    expect(printedSchema.trim()).toMatchSnapshot();
  });
});
