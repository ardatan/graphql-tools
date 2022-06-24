import { stitchSchemas } from '@graphql-tools/stitch';
import { buildSchema } from 'graphql';
import { ValidationLevel } from '../src/types.js';

describe('Field validations', () => {
  describe('fieldTypeConsistency', () => {
    it('raises for inconsistent named types', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field: String }') },
            { schema: buildSchema('type Query { field: URL } scalar URL') },
          ],
        });
      }).toThrow(/inconsistent named types/);
    });

    it('raises for inconsistent list types', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field: [URL] } scalar URL') },
            { schema: buildSchema('type Query { field: URL } scalar URL') },
          ],
        });
      }).toThrow(/inconsistent list types/);
    });

    it('permits consistent named types', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field: [URL] } scalar URL') },
            { schema: buildSchema('type Query { field: [URL] } scalar URL') },
          ],
        });
      }).not.toThrow();
    });
  });

  describe('proxiableScalars', () => {
    it('permits whitelisted scalar proxies', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: {
              validationLevel: ValidationLevel.Error,
              proxiableScalars: {
                ID: ['String'],
              },
            },
          },
          subschemas: [
            { schema: buildSchema('type Query { field: [String] }') },
            { schema: buildSchema('type Query { field: [ID] }') },
          ],
        });
      }).not.toThrow();
    });

    it('throws for non-proxiable scalar types', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: {
              validationLevel: ValidationLevel.Error,
              proxiableScalars: {
                ID: ['Thing'],
              },
            },
          },
          subschemas: [
            { schema: buildSchema('type Query { field: [Thing] } type Thing { id: ID }') },
            { schema: buildSchema('type Query { field: [ID] }') },
          ],
        });
      }).toThrow(/not proxiable scalars/);
    });
  });

  describe('fieldNullConsistency', () => {
    it('raises stricter nullability in canonical definition', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field: String }') },
            { schema: buildSchema('type Query { field: String! }') },
          ],
        });
      }).toThrow(/is not-null while some subschemas permit null/);
    });

    it('permits looser nullability in canonical definition', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field: String! }') },
            { schema: buildSchema('type Query { field: String }') },
          ],
        });
      }).not.toThrow();
    });

    it('raises for mismatched strict null definition', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: {
              validationLevel: ValidationLevel.Error,
              strictNullComparison: true,
            },
          },
          subschemas: [
            { schema: buildSchema('type Query { field: String! }') },
            { schema: buildSchema('type Query { field: String }') },
          ],
        });
      }).toThrow(/does not match across subschemas/);
    });
  });
});

describe('Argument validations', () => {
  describe('inputNameConsistency', () => {
    it('raises for inconsistent argument names', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field(arg1: Int): Int }') },
            { schema: buildSchema('type Query { field(arg2: Int): Int }') },
          ],
        });
      }).toThrow(/inconsistent argument names/);
    });

    it('permits consistent argument names', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field(arg: Int): Int }') },
            { schema: buildSchema('type Query { field(arg: Int): Int }') },
          ],
        });
      }).not.toThrow();
    });
  });

  describe('inputNullConsistency', () => {
    it('raises looser nullability in canonical definition', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field(arg: Int!): Int }') },
            { schema: buildSchema('type Query { field(arg: Int): Int }') },
          ],
        });
      }).toThrow(/permits null while some subschemas require not-null/);
    });

    it('permits stricter nullability in canonical definition', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field(arg: Int): Int }') },
            { schema: buildSchema('type Query { field(arg: Int!): Int }') },
          ],
        });
      }).not.toThrow();
    });

    it('raises strict nullability mismatches', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: {
              validationLevel: ValidationLevel.Error,
              strictNullComparison: true,
            },
          },
          subschemas: [
            { schema: buildSchema('type Query { field(arg: Int): Int }') },
            { schema: buildSchema('type Query { field(arg: Int!): Int }') },
          ],
        });
      }).toThrow(/does not match across subschemas/);
    });
  });

  describe('inputTypeConsistency', () => {
    it('raises for inconsistent argument named types', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field(arg: String): String }') },
            { schema: buildSchema('type Query { field(arg: URL): String } scalar URL') },
          ],
        });
      }).toThrow(/inconsistent named types/);
    });

    it('raises for inconsistent argument list types', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field(arg: URL): String } scalar URL') },
            { schema: buildSchema('type Query { field(arg: [URL]): String } scalar URL') },
          ],
        });
      }).toThrow(/inconsistent list types/);
    });

    it('permits consistent argument types', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field(arg: [URL]): String } scalar URL') },
            { schema: buildSchema('type Query { field(arg: [URL]): String } scalar URL') },
          ],
        });
      }).not.toThrow();
    });
  });

  describe('inputTypeConsistency with enums', () => {
    it('raises for inconsistent argument enum values', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field(status: Status): Int } enum Status { YES }') },
            { schema: buildSchema('type Query { field(status: Status): Int } enum Status { NO }') },
          ],
        });
      }).toThrow(/inconsistent values/);
    });

    it('permits consistent argument enum values', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field(status: Status): Int } enum Status { YES NO }') },
            { schema: buildSchema('type Query { field(status: Status): Int } enum Status { NO YES }') },
          ],
        });
      }).not.toThrow();
    });
  });
});

describe('InputObject validations', () => {
  describe('inputNameConsistency', () => {
    it('raises for inconsistent input fields', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field(blob: Blob): Int } input Blob { field1: Int }') },
            { schema: buildSchema('type Query { field(blob: Blob): Int } input Blob { field2: Int }') },
          ],
        });
      }).toThrow(/not implemented by all subschemas/);
    });

    it('permits for consistent input fields', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field(blob: Blob): Int } input Blob { field: Int }') },
            { schema: buildSchema('type Query { field(blob: Blob): Int } input Blob { field: Int }') },
          ],
        });
      }).not.toThrow();
    });
  });

  describe('inputNullConsistency', () => {
    it('raises looser nullability in canonical definition', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field(blob: Blob): Int } input Blob { field: Int! }') },
            { schema: buildSchema('type Query { field(blob: Blob): Int } input Blob { field: Int }') },
          ],
        });
      }).toThrow(/permits null while some subschemas require not-null/);
    });

    it('permits stricter nullability in canonical definition', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field(blob: Blob): Int } input Blob { field: Int }') },
            { schema: buildSchema('type Query { field(blob: Blob): Int } input Blob { field: Int! }') },
          ],
        });
      }).not.toThrow();
    });

    it('raises strict nullability mismatches', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: {
              validationLevel: ValidationLevel.Error,
              strictNullComparison: true,
            },
          },
          subschemas: [
            { schema: buildSchema('type Query { field(blob: Blob): Int } input Blob { field: Int }') },
            { schema: buildSchema('type Query { field(blob: Blob): Int } input Blob { field: Int! }') },
          ],
        });
      }).toThrow(/does not match across subschemas/);
    });
  });

  describe('inputTypeConsistency', () => {
    it('raises for inconsistent named types', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field(blob: Blob): Int } input Blob { field: String }') },
            { schema: buildSchema('type Query { field(blob: Blob): Int } input Blob { field: URL } scalar URL') },
          ],
        });
      }).toThrow(/inconsistent named types/);
    });

    it('raises for inconsistent list types', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field(blob: Blob): Int } input Blob { field: String }') },
            { schema: buildSchema('type Query { field(blob: Blob): Int } input Blob { field: [String] }') },
          ],
        });
      }).toThrow(/inconsistent list types/);
    });

    it('permits consistent types', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field(blob: Blob): Int } input Blob { field: [URL] } scalar URL') },
            { schema: buildSchema('type Query { field(blob: Blob): Int } input Blob { field: [URL] } scalar URL') },
          ],
        });
      }).not.toThrow();
    });
  });

  describe('inputTypeConsistency with enums', () => {
    it('raises for inconsistent input field enum values', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            {
              schema: buildSchema(
                'type Query { field(blob: Blob): Int } input Blob { status: BlobStatus! } enum BlobStatus { YES }'
              ),
            },
            {
              schema: buildSchema(
                'type Query { field(blob: Blob): Int } input Blob { status: BlobStatus! } enum BlobStatus { NO }'
              ),
            },
          ],
        });
      }).toThrow(/inconsistent values/);
    });

    it('permits consistent input field enum values', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            {
              schema: buildSchema(
                'type Query { field(blob: Blob): Int } input Blob { status: BlobStatus! } enum BlobStatus { YES NO }'
              ),
            },
            {
              schema: buildSchema(
                'type Query { field(blob: Blob): Int } input Blob { status: BlobStatus! } enum BlobStatus { NO YES }'
              ),
            },
          ],
        });
      }).not.toThrow();
    });
  });
});

describe('Scoped validation settings', () => {
  it('adjustable by field', () => {
    expect(() => {
      stitchSchemas({
        typeMergingOptions: {
          validationSettings: { validationLevel: ValidationLevel.Error },
          validationScopes: {
            'Query.field1': { strictNullComparison: true },
          },
        },
        subschemas: [
          { schema: buildSchema('type Query { field1: Int! }') },
          { schema: buildSchema('type Query { field1: Int }') },
        ],
      });
    }).toThrow(/does not match/);
  });
});
