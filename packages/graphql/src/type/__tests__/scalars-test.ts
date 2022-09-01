import { parseValue as parseValueToAST } from '../../language/parser.js';

import { GraphQLBoolean, GraphQLFloat, GraphQLID, GraphQLInt, GraphQLString } from '../scalars.js';

describe('Type System: Specified scalar types', () => {
  describe('GraphQLInt', () => {
    it('parseValue', () => {
      function parseValue(value: unknown) {
        return GraphQLInt.parseValue(value);
      }

      expect(parseValue(1)).toEqual(1);
      expect(parseValue(0)).toEqual(0);
      expect(parseValue(-1)).toEqual(-1);

      expect(() => parseValue(9876504321)).toThrow('Int cannot represent non 32-bit signed integer value: 9876504321');
      expect(() => parseValue(-9876504321)).toThrow(
        'Int cannot represent non 32-bit signed integer value: -9876504321'
      );
      expect(() => parseValue(0.1)).toThrow('Int cannot represent non-integer value: 0.1');
      expect(() => parseValue(NaN)).toThrow('Int cannot represent non-integer value: NaN');
      expect(() => parseValue(Infinity)).toThrow('Int cannot represent non-integer value: Infinity');

      expect(() => parseValue(undefined)).toThrow('Int cannot represent non-integer value: undefined');
      expect(() => parseValue(null)).toThrow('Int cannot represent non-integer value: null');
      expect(() => parseValue('')).toThrow('Int cannot represent non-integer value: ""');
      expect(() => parseValue('123')).toThrow('Int cannot represent non-integer value: "123"');
      expect(() => parseValue(false)).toThrow('Int cannot represent non-integer value: false');
      expect(() => parseValue(true)).toThrow('Int cannot represent non-integer value: true');
      expect(() => parseValue([1])).toThrow('Int cannot represent non-integer value: [1]');
      expect(() => parseValue({ value: 1 })).toThrow('Int cannot represent non-integer value: { value: 1 }');
    });

    it('parseLiteral', () => {
      function parseLiteral(str: string) {
        return GraphQLInt.parseLiteral(parseValueToAST(str), undefined);
      }

      expect(parseLiteral('1')).toEqual(1);
      expect(parseLiteral('0')).toEqual(0);
      expect(parseLiteral('-1')).toEqual(-1);

      expect(() => parseLiteral('9876504321')).toThrow(
        'Int cannot represent non 32-bit signed integer value: 9876504321'
      );
      expect(() => parseLiteral('-9876504321')).toThrow(
        'Int cannot represent non 32-bit signed integer value: -9876504321'
      );

      expect(() => parseLiteral('1.0')).toThrow('Int cannot represent non-integer value: 1.0');
      expect(() => parseLiteral('null')).toThrow('Int cannot represent non-integer value: null');
      expect(() => parseLiteral('""')).toThrow('Int cannot represent non-integer value: ""');
      expect(() => parseLiteral('"123"')).toThrow('Int cannot represent non-integer value: "123"');
      expect(() => parseLiteral('false')).toThrow('Int cannot represent non-integer value: false');
      expect(() => parseLiteral('[1]')).toThrow('Int cannot represent non-integer value: [1]');
      expect(() => parseLiteral('{ value: 1 }')).toThrow('Int cannot represent non-integer value: { value: 1 }');
      expect(() => parseLiteral('ENUM_VALUE')).toThrow('Int cannot represent non-integer value: ENUM_VALUE');
      expect(() => parseLiteral('$var')).toThrow('Int cannot represent non-integer value: $var');
    });

    it('serialize', () => {
      function serialize(value: unknown) {
        return GraphQLInt.serialize(value);
      }

      expect(serialize(1)).toEqual(1);
      expect(serialize('123')).toEqual(123);
      expect(serialize(0)).toEqual(0);
      expect(serialize(-1)).toEqual(-1);
      expect(serialize(1e5)).toEqual(100000);
      expect(serialize(false)).toEqual(0);
      expect(serialize(true)).toEqual(1);

      const customValueOfObj = {
        value: 5,
        valueOf() {
          return this.value;
        },
      };
      expect(serialize(customValueOfObj)).toEqual(5);

      // The GraphQL specification does not allow serializing non-integer values
      // as Int to avoid accidental data loss.
      expect(() => serialize(0.1)).toThrow('Int cannot represent non-integer value: 0.1');
      expect(() => serialize(1.1)).toThrow('Int cannot represent non-integer value: 1.1');
      expect(() => serialize(-1.1)).toThrow('Int cannot represent non-integer value: -1.1');
      expect(() => serialize('-1.1')).toThrow('Int cannot represent non-integer value: "-1.1"');

      // Maybe a safe JavaScript int, but bigger than 2^32, so not
      // representable as a GraphQL Int
      expect(() => serialize(9876504321)).toThrow('Int cannot represent non 32-bit signed integer value: 9876504321');
      expect(() => serialize(-9876504321)).toThrow('Int cannot represent non 32-bit signed integer value: -9876504321');

      // Too big to represent as an Int in JavaScript or GraphQL
      expect(() => serialize(1e100)).toThrow('Int cannot represent non 32-bit signed integer value: 1e+100');
      expect(() => serialize(-1e100)).toThrow('Int cannot represent non 32-bit signed integer value: -1e+100');
      expect(() => serialize('one')).toThrow('Int cannot represent non-integer value: "one"');

      // Doesn't represent number
      expect(() => serialize('')).toThrow('Int cannot represent non-integer value: ""');
      expect(() => serialize(NaN)).toThrow('Int cannot represent non-integer value: NaN');
      expect(() => serialize(Infinity)).toThrow('Int cannot represent non-integer value: Infinity');
      expect(() => serialize([5])).toThrow('Int cannot represent non-integer value: [5]');
    });
  });

  describe('GraphQLFloat', () => {
    it('parseValue', () => {
      function parseValue(value: unknown) {
        return GraphQLFloat.parseValue(value);
      }

      expect(parseValue(1)).toEqual(1);
      expect(parseValue(0)).toEqual(0);
      expect(parseValue(-1)).toEqual(-1);
      expect(parseValue(0.1)).toEqual(0.1);
      expect(parseValue(Math.PI)).toEqual(Math.PI);

      expect(() => parseValue(NaN)).toThrow('Float cannot represent non numeric value: NaN');
      expect(() => parseValue(Infinity)).toThrow('Float cannot represent non numeric value: Infinity');

      expect(() => parseValue(undefined)).toThrow('Float cannot represent non numeric value: undefined');
      expect(() => parseValue(null)).toThrow('Float cannot represent non numeric value: null');
      expect(() => parseValue('')).toThrow('Float cannot represent non numeric value: ""');
      expect(() => parseValue('123')).toThrow('Float cannot represent non numeric value: "123"');
      expect(() => parseValue('123.5')).toThrow('Float cannot represent non numeric value: "123.5"');
      expect(() => parseValue(false)).toThrow('Float cannot represent non numeric value: false');
      expect(() => parseValue(true)).toThrow('Float cannot represent non numeric value: true');
      expect(() => parseValue([0.1])).toThrow('Float cannot represent non numeric value: [0.1]');
      expect(() => parseValue({ value: 0.1 })).toThrow('Float cannot represent non numeric value: { value: 0.1 }');
    });

    it('parseLiteral', () => {
      function parseLiteral(str: string) {
        return GraphQLFloat.parseLiteral(parseValueToAST(str), undefined);
      }

      expect(parseLiteral('1')).toEqual(1);
      expect(parseLiteral('0')).toEqual(0);
      expect(parseLiteral('-1')).toEqual(-1);
      expect(parseLiteral('0.1')).toEqual(0.1);
      expect(parseLiteral(Math.PI.toString())).toEqual(Math.PI);

      expect(() => parseLiteral('null')).toThrow('Float cannot represent non numeric value: null');
      expect(() => parseLiteral('""')).toThrow('Float cannot represent non numeric value: ""');
      expect(() => parseLiteral('"123"')).toThrow('Float cannot represent non numeric value: "123"');
      expect(() => parseLiteral('"123.5"')).toThrow('Float cannot represent non numeric value: "123.5"');
      expect(() => parseLiteral('false')).toThrow('Float cannot represent non numeric value: false');
      expect(() => parseLiteral('[0.1]')).toThrow('Float cannot represent non numeric value: [0.1]');
      expect(() => parseLiteral('{ value: 0.1 }')).toThrow('Float cannot represent non numeric value: { value: 0.1 }');
      expect(() => parseLiteral('ENUM_VALUE')).toThrow('Float cannot represent non numeric value: ENUM_VALUE');
      expect(() => parseLiteral('$var')).toThrow('Float cannot represent non numeric value: $var');
    });

    it('serialize', () => {
      function serialize(value: unknown) {
        return GraphQLFloat.serialize(value);
      }

      expect(serialize(1)).toEqual(1.0);
      expect(serialize(0)).toEqual(0.0);
      expect(serialize('123.5')).toEqual(123.5);
      expect(serialize(-1)).toEqual(-1.0);
      expect(serialize(0.1)).toEqual(0.1);
      expect(serialize(1.1)).toEqual(1.1);
      expect(serialize(-1.1)).toEqual(-1.1);
      expect(serialize('-1.1')).toEqual(-1.1);
      expect(serialize(false)).toEqual(0.0);
      expect(serialize(true)).toEqual(1.0);

      const customValueOfObj = {
        value: 5.5,
        valueOf() {
          return this.value;
        },
      };
      expect(serialize(customValueOfObj)).toEqual(5.5);

      expect(() => serialize(NaN)).toThrow('Float cannot represent non numeric value: NaN');
      expect(() => serialize(Infinity)).toThrow('Float cannot represent non numeric value: Infinity');
      expect(() => serialize('one')).toThrow('Float cannot represent non numeric value: "one"');
      expect(() => serialize('')).toThrow('Float cannot represent non numeric value: ""');
      expect(() => serialize([5])).toThrow('Float cannot represent non numeric value: [5]');
    });
  });

  describe('GraphQLString', () => {
    it('parseValue', () => {
      function parseValue(value: unknown) {
        return GraphQLString.parseValue(value);
      }

      expect(parseValue('foo')).toEqual('foo');

      expect(() => parseValue(undefined)).toThrow('String cannot represent a non string value: undefined');
      expect(() => parseValue(null)).toThrow('String cannot represent a non string value: null');
      expect(() => parseValue(1)).toThrow('String cannot represent a non string value: 1');
      expect(() => parseValue(NaN)).toThrow('String cannot represent a non string value: NaN');
      expect(() => parseValue(false)).toThrow('String cannot represent a non string value: false');
      expect(() => parseValue(['foo'])).toThrow('String cannot represent a non string value: ["foo"]');
      expect(() => parseValue({ value: 'foo' })).toThrow(
        'String cannot represent a non string value: { value: "foo" }'
      );
    });

    it('parseLiteral', () => {
      function parseLiteral(str: string) {
        return GraphQLString.parseLiteral(parseValueToAST(str), undefined);
      }

      expect(parseLiteral('"foo"')).toEqual('foo');
      expect(parseLiteral('"""bar"""')).toEqual('bar');

      expect(() => parseLiteral('null')).toThrow('String cannot represent a non string value: null');
      expect(() => parseLiteral('1')).toThrow('String cannot represent a non string value: 1');
      expect(() => parseLiteral('0.1')).toThrow('String cannot represent a non string value: 0.1');
      expect(() => parseLiteral('false')).toThrow('String cannot represent a non string value: false');
      expect(() => parseLiteral('["foo"]')).toThrow('String cannot represent a non string value: ["foo"]');
      expect(() => parseLiteral('{ value: "foo" }')).toThrow(
        'String cannot represent a non string value: { value: "foo" }'
      );
      expect(() => parseLiteral('ENUM_VALUE')).toThrow('String cannot represent a non string value: ENUM_VALUE');
      expect(() => parseLiteral('$var')).toThrow('String cannot represent a non string value: $var');
    });

    it('serialize', () => {
      function serialize(value: unknown) {
        return GraphQLString.serialize(value);
      }

      expect(serialize('string')).toEqual('string');
      expect(serialize(1)).toEqual('1');
      expect(serialize(-1.1)).toEqual('-1.1');
      expect(serialize(true)).toEqual('true');
      expect(serialize(false)).toEqual('false');

      const valueOf = () => 'valueOf string';
      const toJSON = () => 'toJSON string';

      const valueOfAndToJSONValue = { valueOf, toJSON };
      expect(serialize(valueOfAndToJSONValue)).toEqual('valueOf string');

      const onlyToJSONValue = { toJSON };
      expect(serialize(onlyToJSONValue)).toEqual('toJSON string');

      expect(() => serialize(NaN)).toThrow('String cannot represent value: NaN');

      expect(() => serialize([1])).toThrow('String cannot represent value: [1]');

      const badObjValue = {};
      expect(() => serialize(badObjValue)).toThrow('String cannot represent value: {}');

      const badValueOfObjValue = { valueOf: 'valueOf string' };
      expect(() => serialize(badValueOfObjValue)).toThrow(
        'String cannot represent value: { valueOf: "valueOf string" }'
      );
    });
  });

  describe('GraphQLBoolean', () => {
    it('parseValue', () => {
      function parseValue(value: unknown) {
        return GraphQLBoolean.parseValue(value);
      }

      expect(parseValue(true)).toEqual(true);
      expect(parseValue(false)).toEqual(false);

      expect(() => parseValue(undefined)).toThrow('Boolean cannot represent a non boolean value: undefined');
      expect(() => parseValue(null)).toThrow('Boolean cannot represent a non boolean value: null');
      expect(() => parseValue(0)).toThrow('Boolean cannot represent a non boolean value: 0');
      expect(() => parseValue(1)).toThrow('Boolean cannot represent a non boolean value: 1');
      expect(() => parseValue(NaN)).toThrow('Boolean cannot represent a non boolean value: NaN');
      expect(() => parseValue('')).toThrow('Boolean cannot represent a non boolean value: ""');
      expect(() => parseValue('false')).toThrow('Boolean cannot represent a non boolean value: "false"');
      expect(() => parseValue([false])).toThrow('Boolean cannot represent a non boolean value: [false]');
      expect(() => parseValue({ value: false })).toThrow(
        'Boolean cannot represent a non boolean value: { value: false }'
      );
    });

    it('parseLiteral', () => {
      function parseLiteral(str: string) {
        return GraphQLBoolean.parseLiteral(parseValueToAST(str), undefined);
      }

      expect(parseLiteral('true')).toEqual(true);
      expect(parseLiteral('false')).toEqual(false);

      expect(() => parseLiteral('null')).toThrow('Boolean cannot represent a non boolean value: null');
      expect(() => parseLiteral('0')).toThrow('Boolean cannot represent a non boolean value: 0');
      expect(() => parseLiteral('1')).toThrow('Boolean cannot represent a non boolean value: 1');
      expect(() => parseLiteral('0.1')).toThrow('Boolean cannot represent a non boolean value: 0.1');
      expect(() => parseLiteral('""')).toThrow('Boolean cannot represent a non boolean value: ""');
      expect(() => parseLiteral('"false"')).toThrow('Boolean cannot represent a non boolean value: "false"');
      expect(() => parseLiteral('[false]')).toThrow('Boolean cannot represent a non boolean value: [false]');
      expect(() => parseLiteral('{ value: false }')).toThrow(
        'Boolean cannot represent a non boolean value: { value: false }'
      );
      expect(() => parseLiteral('ENUM_VALUE')).toThrow('Boolean cannot represent a non boolean value: ENUM_VALUE');
      expect(() => parseLiteral('$var')).toThrow('Boolean cannot represent a non boolean value: $var');
    });

    it('serialize', () => {
      function serialize(value: unknown) {
        return GraphQLBoolean.serialize(value);
      }

      expect(serialize(1)).toEqual(true);
      expect(serialize(0)).toEqual(false);
      expect(serialize(true)).toEqual(true);
      expect(serialize(false)).toEqual(false);
      expect(
        serialize({
          value: true,
          valueOf() {
            return (this as { value: boolean }).value;
          },
        })
      ).toEqual(true);

      expect(() => serialize(NaN)).toThrow('Boolean cannot represent a non boolean value: NaN');
      expect(() => serialize('')).toThrow('Boolean cannot represent a non boolean value: ""');
      expect(() => serialize('true')).toThrow('Boolean cannot represent a non boolean value: "true"');
      expect(() => serialize([false])).toThrow('Boolean cannot represent a non boolean value: [false]');
      expect(() => serialize({})).toThrow('Boolean cannot represent a non boolean value: {}');
    });
  });

  describe('GraphQLID', () => {
    it('parseValue', () => {
      function parseValue(value: unknown) {
        return GraphQLID.parseValue(value);
      }

      expect(parseValue('')).toEqual('');
      expect(parseValue('1')).toEqual('1');
      expect(parseValue('foo')).toEqual('foo');
      expect(parseValue(1)).toEqual('1');
      expect(parseValue(0)).toEqual('0');
      expect(parseValue(-1)).toEqual('-1');

      // Maximum and minimum safe numbers in JS
      expect(parseValue(9007199254740991)).toEqual('9007199254740991');
      expect(parseValue(-9007199254740991)).toEqual('-9007199254740991');

      expect(() => parseValue(undefined)).toThrow('ID cannot represent value: undefined');
      expect(() => parseValue(null)).toThrow('ID cannot represent value: null');
      expect(() => parseValue(0.1)).toThrow('ID cannot represent value: 0.1');
      expect(() => parseValue(NaN)).toThrow('ID cannot represent value: NaN');
      expect(() => parseValue(Infinity)).toThrow('ID cannot represent value: Inf');
      expect(() => parseValue(false)).toThrow('ID cannot represent value: false');
      expect(() => GraphQLID.parseValue(['1'])).toThrow('ID cannot represent value: ["1"]');
      expect(() => GraphQLID.parseValue({ value: '1' })).toThrow('ID cannot represent value: { value: "1" }');
    });

    it('parseLiteral', () => {
      function parseLiteral(str: string) {
        return GraphQLID.parseLiteral(parseValueToAST(str), undefined);
      }

      expect(parseLiteral('""')).toEqual('');
      expect(parseLiteral('"1"')).toEqual('1');
      expect(parseLiteral('"foo"')).toEqual('foo');
      expect(parseLiteral('"""foo"""')).toEqual('foo');
      expect(parseLiteral('1')).toEqual('1');
      expect(parseLiteral('0')).toEqual('0');
      expect(parseLiteral('-1')).toEqual('-1');

      // Support arbitrary long numbers even if they can't be represented in JS
      expect(parseLiteral('90071992547409910')).toEqual('90071992547409910');
      expect(parseLiteral('-90071992547409910')).toEqual('-90071992547409910');

      expect(() => parseLiteral('null')).toThrow('ID cannot represent a non-string and non-integer value: null');
      expect(() => parseLiteral('0.1')).toThrow('ID cannot represent a non-string and non-integer value: 0.1');
      expect(() => parseLiteral('false')).toThrow('ID cannot represent a non-string and non-integer value: false');
      expect(() => parseLiteral('["1"]')).toThrow('ID cannot represent a non-string and non-integer value: ["1"]');
      expect(() => parseLiteral('{ value: "1" }')).toThrow(
        'ID cannot represent a non-string and non-integer value: { value: "1" }'
      );
      expect(() => parseLiteral('ENUM_VALUE')).toThrow(
        'ID cannot represent a non-string and non-integer value: ENUM_VALUE'
      );
      expect(() => parseLiteral('$var')).toThrow('ID cannot represent a non-string and non-integer value: $var');
    });

    it('serialize', () => {
      function serialize(value: unknown) {
        return GraphQLID.serialize(value);
      }

      expect(serialize('string')).toEqual('string');
      expect(serialize('false')).toEqual('false');
      expect(serialize('')).toEqual('');
      expect(serialize(123)).toEqual('123');
      expect(serialize(0)).toEqual('0');
      expect(serialize(-1)).toEqual('-1');

      const valueOf = () => 'valueOf ID';
      const toJSON = () => 'toJSON ID';

      const valueOfAndToJSONValue = { valueOf, toJSON };
      expect(serialize(valueOfAndToJSONValue)).toEqual('valueOf ID');

      const onlyToJSONValue = { toJSON };
      expect(serialize(onlyToJSONValue)).toEqual('toJSON ID');

      const badObjValue = {
        _id: false,
        valueOf() {
          return this._id;
        },
      };
      expect(() => serialize(badObjValue)).toThrow(
        'ID cannot represent value: { _id: false, valueOf: [function valueOf] }'
      );

      expect(() => serialize(true)).toThrow('ID cannot represent value: true');

      expect(() => serialize(3.14)).toThrow('ID cannot represent value: 3.14');

      expect(() => serialize({})).toThrow('ID cannot represent value: {}');

      expect(() => serialize(['abc'])).toThrow('ID cannot represent value: ["abc"]');
    });
  });
});
