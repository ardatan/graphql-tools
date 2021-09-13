import { parseEndpoint } from './parseEndpoint';
describe('parseEndpoint', function () {
    test('work for minimal url', function () {
        expect(parseEndpoint('http://localhost:4466')).toMatchSnapshot();
    });
    test('work for minimal docker url', function () {
        expect(parseEndpoint('http://prisma:4466')).toMatchSnapshot();
    });
    test('local behind a proxy', function () {
        // This snapshot will be incorrect for now as URL does not have enough
        // information to determine if something is truly local
        expect(parseEndpoint('http://local.dev')).toMatchSnapshot();
    });
    test('work for url with service', function () {
        expect(parseEndpoint('http://localhost:4466/service-name')).toMatchSnapshot();
    });
    test('work for url with service and stage', function () {
        expect(parseEndpoint('http://localhost:4466/service-name/stage')).toMatchSnapshot();
    });
    test('private url', function () {
        expect(parseEndpoint('https://test1_workspace.prisma.sh/tessst/dev')).toMatchSnapshot();
    });
    test('shared url', function () {
        expect(parseEndpoint('https://eu1.prisma.sh/workspace-name/tessst/dev')).toMatchSnapshot();
    });
    test('custom hosted url in internet', function () {
        expect(parseEndpoint('https://api-prisma.divyendusingh.com/zebra-4069/dev')).toMatchSnapshot();
    });
    test('custom hosted url as ip in internet', function () {
        expect(parseEndpoint('http://13.228.39.83:4466')).toMatchSnapshot();
    });
    test('url on a subdomain', function () {
        expect(parseEndpoint('https://db.cloud.prisma.sh/test-token/test')).toMatchSnapshot();
    });
});
