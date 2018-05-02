// graphql does export this function but it looks like the types are not up to date.
// @ts-ignore
import {assertValidSchema} from 'graphql';
import {mergeSchemas, transformSchema} from '../..';
import FilterFields from './FilterFields';
import {propertySchema} from '../testingSchemas';

describe('Filtering fields', () => {
  // Use case: breaking apart monolithic GQL codebase into microservices.
  // E.g. strip out types/fields from the monolith slowly and re-add them
  // as stitched resolvers to another service.
  it('should allow stitching a previously filtered field onto a type', async () => {
    const filteredSchema = transformSchema(propertySchema, [
      new FilterFields({
        Property: ['location'],
      }),
    ]);

    assertValidSchema(filteredSchema);

    const mergedSchemas = mergeSchemas({
      schemas: [
        filteredSchema,
        `
          extend type Property {
            location: Location
          }
        `,
      ],
    });

    assertValidSchema(mergedSchemas);
  });
});
