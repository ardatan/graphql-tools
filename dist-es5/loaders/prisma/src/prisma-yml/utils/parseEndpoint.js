import { clusterEndpointMapReverse } from '../constants';
import { URL } from 'url';
function getClusterName(origin) {
    if (clusterEndpointMapReverse[origin]) {
        return clusterEndpointMapReverse[origin];
    }
    if (origin.endsWith('prisma.sh')) {
        return origin.split('_')[0].replace(/https?:\/\//, '');
    }
    if (isLocal(origin)) {
        return 'local';
    }
    return 'default';
}
var getWorkspaceFromPrivateOrigin = function (origin) {
    var split = origin.split('_');
    if (split.length > 1) {
        return split[1].split('.')[0];
    }
    return null;
};
var isLocal = function (origin) { return origin.includes('localhost') || origin.includes('127.0.0.1'); };
export function parseEndpoint(endpoint) {
    /*
      Terminology:
        local - hosted locally using docker and accessed using localhost or prisma or local web proxy like domain.dev
        shared - demo server
        isPrivate - private hosted by Prisma or private and self-hosted, important that in our terminology a local server is not private
    */
    var url = new URL(endpoint);
    var splittedPath = url.pathname.split('/');
    // assuming, that the pathname always starts with a leading /, we always can ignore the first element of the split array
    var service = splittedPath.length > 3 ? splittedPath[2] : splittedPath[1] || 'default';
    var stage = splittedPath.length > 3 ? splittedPath[3] : splittedPath[2] || 'default';
    // This logic might break for self-hosted servers incorrectly yielding a "workspace" simply if the UX has
    // enough "/"es like if https://custom.dev/not-a-workspace/ is the base Prisma URL then for default/default service/stage
    // pair. This function would incorrectly return not-a-workspace as a workspace.
    var workspaceSlug = splittedPath.length > 3 ? splittedPath[1] : null;
    var shared = ['eu1.prisma.sh', 'us1.prisma.sh'].includes(url.host);
    // When using localAliases, do an exact match because of 'prisma' option which is added for local docker networking access
    var localAliases = ['localhost', '127.0.0.1', 'prisma'];
    var isPrivate = !shared && !localAliases.includes(url.hostname);
    var local = !shared && !isPrivate && !workspaceSlug;
    if (isPrivate && !workspaceSlug) {
        workspaceSlug = getWorkspaceFromPrivateOrigin(url.origin);
    }
    return {
        clusterBaseUrl: url.origin,
        service: service,
        stage: stage,
        local: local,
        isPrivate: isPrivate,
        shared: shared,
        workspaceSlug: workspaceSlug,
        clusterName: getClusterName(url.origin),
    };
}
