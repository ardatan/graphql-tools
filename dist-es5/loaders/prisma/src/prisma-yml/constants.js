import _ from 'lodash';
export var cloudApiEndpoint = process.env['CLOUD_API_ENDPOINT'] || 'https://api.cloud.prisma.sh';
export var clusterEndpointMap = {
    'prisma-eu1': 'https://eu1.prisma.sh',
    'prisma-us1': 'https://us1.prisma.sh',
};
export var clusterEndpointMapReverse = _.invert(clusterEndpointMap);
