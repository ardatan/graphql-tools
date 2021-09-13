import { replaceYamlValue, migrateToEndpoint } from './yamlComment';
describe('replaceYamlValue', function () {
    test('when document is clean', function () {
        var input = "endpoint: https://eu1.prisma.sh/public-asdf/my-service/dev\ndatamodel: datamodel.prisma";
        var output = replaceYamlValue(input, 'endpoint', 'http://localhost:4466');
        expect({ input: input, output: output }).toMatchSnapshot();
    });
    test('when comments already exist', function () {
        var input = "#anothercomment: asdasd\nendpoint: https://eu1.prisma.sh/public-asdf/my-service/dev\n\n#endpoint: asdasd\ndatamodel: datamodel.prisma";
        var output = replaceYamlValue(input, 'endpoint', 'http://localhost:4466');
        expect({ input: input, output: output }).toMatchSnapshot();
    });
    test('when key does not yet exist', function () {
        var input = "datamodel: datamodel.prisma";
        var output = replaceYamlValue(input, 'endpoint', 'http://localhost:4466');
        expect({ input: input, output: output }).toMatchSnapshot();
    });
});
describe('migrateToEndpoint', function () {
    test('ignore when endpoint present', function () {
        var input = "endpoint: https://eu1.prisma.sh/public-asdf/my-service/dev\ndatamodel: datamodel.prisma";
        var output = migrateToEndpoint(input, '');
        expect({ input: input, output: output }).toMatchSnapshot();
    });
    test('work in simple case', function () {
        var input = "service: my-service\nstage: dev\ncluster: public-asdf/prisma-eu1\ndatamodel: datamodel.prisma";
        var output = migrateToEndpoint(input, 'https://eu1.prisma.sh/public-asdf/my-service/dev');
        expect({ input: input, output: output }).toMatchSnapshot();
    });
    test('work with different order and respect comments', function () {
        var input = "# don't delete me\nstage: dev\ncluster: public-asdf/prisma-eu1\n\nservice: my-service\n\n\n\ndatamodel: datamodel.prisma";
        var output = migrateToEndpoint(input, 'https://eu1.prisma.sh/public-asdf/my-service/dev');
        expect({ input: input, output: output }).toMatchSnapshot();
    });
});
