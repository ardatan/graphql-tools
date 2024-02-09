import meta from "../../../src/pages/_meta.ts";
import docs_meta from "../../../src/pages/docs/_meta.ts";
import docs_api_meta from "../../../src/pages/docs/api/_meta.ts";
import docs_api_classes_meta from "../../../src/pages/docs/api/classes/_meta.ts";
import docs_api_enums_meta from "../../../src/pages/docs/api/enums/_meta.ts";
import docs_api_interfaces_meta from "../../../src/pages/docs/api/interfaces/_meta.ts";
import docs_api_modules_meta from "../../../src/pages/docs/api/modules/_meta.ts";
import docs_migration_meta from "../../../src/pages/docs/migration/_meta.ts";
export const pageMap = [{
  data: meta
}, {
  name: "docs",
  route: "/docs",
  children: [{
    data: docs_meta
  }, {
    name: "api",
    route: "/docs/api",
    children: [{
      data: docs_api_meta
    }, {
      name: "classes",
      route: "/docs/api/classes",
      children: [{
        data: docs_api_classes_meta
      }, {
        name: "delegate_src.subschema",
        route: "/docs/api/classes/delegate_src.subschema",
        frontMatter: {
          "sidebar_label": "Delegate Src.subschema"
        }
      }, {
        name: "delegate_src.transformer",
        route: "/docs/api/classes/delegate_src.transformer",
        frontMatter: {
          "sidebar_label": "Delegate Src.transformer"
        }
      }, {
        name: "executors_apollo_link_src.executorlink",
        route: "/docs/api/classes/executors_apollo_link_src.executorlink",
        frontMatter: {
          "sidebar_label": "Executors Apollo Link Src.executorlink"
        }
      }, {
        name: "links_src.awaitvariableslink",
        route: "/docs/api/classes/links_src.awaitvariableslink",
        frontMatter: {
          "sidebar_label": "Links Src.awaitvariableslink"
        }
      }, {
        name: "loaders_apollo_engine_src.apolloengineloader",
        route: "/docs/api/classes/loaders_apollo_engine_src.apolloengineloader",
        frontMatter: {
          "sidebar_label": "Loaders Apollo Engine Src.apolloengineloader"
        }
      }, {
        name: "loaders_code_file_src.codefileloader",
        route: "/docs/api/classes/loaders_code_file_src.codefileloader",
        frontMatter: {
          "sidebar_label": "Loaders Code File Src.codefileloader"
        }
      }, {
        name: "loaders_git_src.gitloader",
        route: "/docs/api/classes/loaders_git_src.gitloader",
        frontMatter: {
          "sidebar_label": "Loaders Git Src.gitloader"
        }
      }, {
        name: "loaders_github_src.githubloader",
        route: "/docs/api/classes/loaders_github_src.githubloader",
        frontMatter: {
          "sidebar_label": "Loaders GitHub Src.githubloader"
        }
      }, {
        name: "loaders_graphql_file_src.graphqlfileloader",
        route: "/docs/api/classes/loaders_graphql_file_src.graphqlfileloader",
        frontMatter: {
          "sidebar_label": "Loaders GraphQL File Src.graphqlfileloader"
        }
      }, {
        name: "loaders_json_file_src.jsonfileloader",
        route: "/docs/api/classes/loaders_json_file_src.jsonfileloader",
        frontMatter: {
          "sidebar_label": "Loaders Json File Src.jsonfileloader"
        }
      }, {
        name: "loaders_module_src.moduleloader",
        route: "/docs/api/classes/loaders_module_src.moduleloader",
        frontMatter: {
          "sidebar_label": "Loaders Module Src.moduleloader"
        }
      }, {
        name: "loaders_prisma_src.prismaloader",
        route: "/docs/api/classes/loaders_prisma_src.prismaloader",
        frontMatter: {
          "sidebar_label": "Loaders Prisma Src.prismaloader"
        }
      }, {
        name: "loaders_url_src.urlloader",
        route: "/docs/api/classes/loaders_url_src.urlloader",
        frontMatter: {
          "sidebar_label": "Loaders URL Src.urlloader"
        }
      }, {
        name: "mock_src.mocklist",
        route: "/docs/api/classes/mock_src.mocklist",
        frontMatter: {
          "sidebar_label": "Mock Src.mocklist"
        }
      }, {
        name: "mock_src.mockstore",
        route: "/docs/api/classes/mock_src.mockstore",
        frontMatter: {
          "sidebar_label": "Mock Src.mockstore"
        }
      }, {
        name: "wrap_src.extractfield",
        route: "/docs/api/classes/wrap_src.extractfield",
        frontMatter: {
          "sidebar_label": "Wrap Src.extractfield"
        }
      }, {
        name: "wrap_src.filterinputobjectfields",
        route: "/docs/api/classes/wrap_src.filterinputobjectfields",
        frontMatter: {
          "sidebar_label": "Wrap Src.filterinputobjectfields"
        }
      }, {
        name: "wrap_src.filterinterfacefields",
        route: "/docs/api/classes/wrap_src.filterinterfacefields",
        frontMatter: {
          "sidebar_label": "Wrap Src.filterinterfacefields"
        }
      }, {
        name: "wrap_src.filterobjectfielddirectives",
        route: "/docs/api/classes/wrap_src.filterobjectfielddirectives",
        frontMatter: {
          "sidebar_label": "Wrap Src.filterobjectfielddirectives"
        }
      }, {
        name: "wrap_src.filterobjectfields",
        route: "/docs/api/classes/wrap_src.filterobjectfields",
        frontMatter: {
          "sidebar_label": "Wrap Src.filterobjectfields"
        }
      }, {
        name: "wrap_src.filterrootfields",
        route: "/docs/api/classes/wrap_src.filterrootfields",
        frontMatter: {
          "sidebar_label": "Wrap Src.filterrootfields"
        }
      }, {
        name: "wrap_src.filtertypes",
        route: "/docs/api/classes/wrap_src.filtertypes",
        frontMatter: {
          "sidebar_label": "Wrap Src.filtertypes"
        }
      }, {
        name: "wrap_src.hoistfield",
        route: "/docs/api/classes/wrap_src.hoistfield",
        frontMatter: {
          "sidebar_label": "Wrap Src.hoistfield"
        }
      }, {
        name: "wrap_src.mapfields",
        route: "/docs/api/classes/wrap_src.mapfields",
        frontMatter: {
          "sidebar_label": "Wrap Src.mapfields"
        }
      }, {
        name: "wrap_src.mapleafvalues",
        route: "/docs/api/classes/wrap_src.mapleafvalues",
        frontMatter: {
          "sidebar_label": "Wrap Src.mapleafvalues"
        }
      }, {
        name: "wrap_src.pruneschema",
        route: "/docs/api/classes/wrap_src.pruneschema",
        frontMatter: {
          "sidebar_label": "Wrap Src.pruneschema"
        }
      }, {
        name: "wrap_src.removeobjectfielddeprecations",
        route: "/docs/api/classes/wrap_src.removeobjectfielddeprecations",
        frontMatter: {
          "sidebar_label": "Wrap Src.removeobjectfielddeprecations"
        }
      }, {
        name: "wrap_src.removeobjectfielddirectives",
        route: "/docs/api/classes/wrap_src.removeobjectfielddirectives",
        frontMatter: {
          "sidebar_label": "Wrap Src.removeobjectfielddirectives"
        }
      }, {
        name: "wrap_src.removeobjectfieldswithdeprecation",
        route: "/docs/api/classes/wrap_src.removeobjectfieldswithdeprecation",
        frontMatter: {
          "sidebar_label": "Wrap Src.removeobjectfieldswithdeprecation"
        }
      }, {
        name: "wrap_src.removeobjectfieldswithdirective",
        route: "/docs/api/classes/wrap_src.removeobjectfieldswithdirective",
        frontMatter: {
          "sidebar_label": "Wrap Src.removeobjectfieldswithdirective"
        }
      }, {
        name: "wrap_src.renameinputobjectfields",
        route: "/docs/api/classes/wrap_src.renameinputobjectfields",
        frontMatter: {
          "sidebar_label": "Wrap Src.renameinputobjectfields"
        }
      }, {
        name: "wrap_src.renameinterfacefields",
        route: "/docs/api/classes/wrap_src.renameinterfacefields",
        frontMatter: {
          "sidebar_label": "Wrap Src.renameinterfacefields"
        }
      }, {
        name: "wrap_src.renameobjectfieldarguments",
        route: "/docs/api/classes/wrap_src.renameobjectfieldarguments",
        frontMatter: {
          "sidebar_label": "Wrap Src.renameobjectfieldarguments"
        }
      }, {
        name: "wrap_src.renameobjectfields",
        route: "/docs/api/classes/wrap_src.renameobjectfields",
        frontMatter: {
          "sidebar_label": "Wrap Src.renameobjectfields"
        }
      }, {
        name: "wrap_src.renamerootfields",
        route: "/docs/api/classes/wrap_src.renamerootfields",
        frontMatter: {
          "sidebar_label": "Wrap Src.renamerootfields"
        }
      }, {
        name: "wrap_src.renameroottypes",
        route: "/docs/api/classes/wrap_src.renameroottypes",
        frontMatter: {
          "sidebar_label": "Wrap Src.renameroottypes"
        }
      }, {
        name: "wrap_src.renametypes",
        route: "/docs/api/classes/wrap_src.renametypes",
        frontMatter: {
          "sidebar_label": "Wrap Src.renametypes"
        }
      }, {
        name: "wrap_src.transformcompositefields",
        route: "/docs/api/classes/wrap_src.transformcompositefields",
        frontMatter: {
          "sidebar_label": "Wrap Src.transformcompositefields"
        }
      }, {
        name: "wrap_src.transformenumvalues",
        route: "/docs/api/classes/wrap_src.transformenumvalues",
        frontMatter: {
          "sidebar_label": "Wrap Src.transformenumvalues"
        }
      }, {
        name: "wrap_src.transforminputobjectfields",
        route: "/docs/api/classes/wrap_src.transforminputobjectfields",
        frontMatter: {
          "sidebar_label": "Wrap Src.transforminputobjectfields"
        }
      }, {
        name: "wrap_src.transforminterfacefields",
        route: "/docs/api/classes/wrap_src.transforminterfacefields",
        frontMatter: {
          "sidebar_label": "Wrap Src.transforminterfacefields"
        }
      }, {
        name: "wrap_src.transformobjectfields",
        route: "/docs/api/classes/wrap_src.transformobjectfields",
        frontMatter: {
          "sidebar_label": "Wrap Src.transformobjectfields"
        }
      }, {
        name: "wrap_src.transformquery",
        route: "/docs/api/classes/wrap_src.transformquery",
        frontMatter: {
          "sidebar_label": "Wrap Src.transformquery"
        }
      }, {
        name: "wrap_src.transformrootfields",
        route: "/docs/api/classes/wrap_src.transformrootfields",
        frontMatter: {
          "sidebar_label": "Wrap Src.transformrootfields"
        }
      }, {
        name: "wrap_src.wrapfields",
        route: "/docs/api/classes/wrap_src.wrapfields",
        frontMatter: {
          "sidebar_label": "Wrap Src.wrapfields"
        }
      }, {
        name: "wrap_src.wrapquery",
        route: "/docs/api/classes/wrap_src.wrapquery",
        frontMatter: {
          "sidebar_label": "Wrap Src.wrapquery"
        }
      }, {
        name: "wrap_src.wraptype",
        route: "/docs/api/classes/wrap_src.wraptype",
        frontMatter: {
          "sidebar_label": "Wrap Src.wraptype"
        }
      }]
    }, {
      name: "enums",
      route: "/docs/api/enums",
      children: [{
        data: docs_api_enums_meta
      }, {
        name: "executors_legacy_ws_src.legacy_ws",
        route: "/docs/api/enums/executors_legacy_ws_src.legacy_ws",
        frontMatter: {
          "sidebar_label": "Executors Legacy Ws Src.legacy Ws"
        }
      }, {
        name: "loaders_url_src.subscriptionprotocol",
        route: "/docs/api/enums/loaders_url_src.subscriptionprotocol",
        frontMatter: {
          "sidebar_label": "Loaders URL Src.subscriptionprotocol"
        }
      }, {
        name: "merge_src.compareval",
        route: "/docs/api/enums/merge_src.compareval",
        frontMatter: {
          "sidebar_label": "Merge Src.compareval"
        }
      }, {
        name: "stitch_src.validationlevel",
        route: "/docs/api/enums/stitch_src.validationlevel",
        frontMatter: {
          "sidebar_label": "Stitch Src.validationlevel"
        }
      }, {
        name: "utils_src.directivelocation",
        route: "/docs/api/enums/utils_src.directivelocation",
        frontMatter: {
          "sidebar_label": "Utils Src.directivelocation"
        }
      }, {
        name: "utils_src.mapperkind",
        route: "/docs/api/enums/utils_src.mapperkind",
        frontMatter: {
          "sidebar_label": "Utils Src.mapperkind"
        }
      }]
    }, {
      name: "interfaces",
      route: "/docs/api/interfaces",
      children: [{
        data: docs_api_interfaces_meta
      }, {
        name: "batch_delegate_src.batchdelegateoptions",
        route: "/docs/api/interfaces/batch_delegate_src.batchdelegateoptions",
        frontMatter: {
          "sidebar_label": "Batch Delegate Src.batchdelegateoptions"
        }
      }, {
        name: "batch_delegate_src.createbatchdelegatefnoptions",
        route: "/docs/api/interfaces/batch_delegate_src.createbatchdelegatefnoptions",
        frontMatter: {
          "sidebar_label": "Batch Delegate Src.createbatchdelegatefnoptions"
        }
      }, {
        name: "delegate_src.batchingoptions",
        route: "/docs/api/interfaces/delegate_src.batchingoptions",
        frontMatter: {
          "sidebar_label": "Delegate Src.batchingoptions"
        }
      }, {
        name: "delegate_src.delegationcontext",
        route: "/docs/api/interfaces/delegate_src.delegationcontext",
        frontMatter: {
          "sidebar_label": "Delegate Src.delegationcontext"
        }
      }, {
        name: "delegate_src.externalobject",
        route: "/docs/api/interfaces/delegate_src.externalobject",
        frontMatter: {
          "sidebar_label": "Delegate Src.externalobject"
        }
      }, {
        name: "delegate_src.icreateproxyingresolveroptions",
        route: "/docs/api/interfaces/delegate_src.icreateproxyingresolveroptions",
        frontMatter: {
          "sidebar_label": "Delegate Src.icreateproxyingresolveroptions"
        }
      }, {
        name: "delegate_src.icreaterequest",
        route: "/docs/api/interfaces/delegate_src.icreaterequest",
        frontMatter: {
          "sidebar_label": "Delegate Src.icreaterequest"
        }
      }, {
        name: "delegate_src.idelegaterequestoptions",
        route: "/docs/api/interfaces/delegate_src.idelegaterequestoptions",
        frontMatter: {
          "sidebar_label": "Delegate Src.idelegaterequestoptions"
        }
      }, {
        name: "delegate_src.idelegatetoschemaoptions",
        route: "/docs/api/interfaces/delegate_src.idelegatetoschemaoptions",
        frontMatter: {
          "sidebar_label": "Delegate Src.idelegatetoschemaoptions"
        }
      }, {
        name: "delegate_src.mergedfieldconfig",
        route: "/docs/api/interfaces/delegate_src.mergedfieldconfig",
        frontMatter: {
          "sidebar_label": "Delegate Src.mergedfieldconfig"
        }
      }, {
        name: "delegate_src.mergedtypeconfig",
        route: "/docs/api/interfaces/delegate_src.mergedtypeconfig",
        frontMatter: {
          "sidebar_label": "Delegate Src.mergedtypeconfig"
        }
      }, {
        name: "delegate_src.mergedtypeentrypoint",
        route: "/docs/api/interfaces/delegate_src.mergedtypeentrypoint",
        frontMatter: {
          "sidebar_label": "Delegate Src.mergedtypeentrypoint"
        }
      }, {
        name: "delegate_src.mergedtypeinfo",
        route: "/docs/api/interfaces/delegate_src.mergedtypeinfo",
        frontMatter: {
          "sidebar_label": "Delegate Src.mergedtypeinfo"
        }
      }, {
        name: "delegate_src.mergedtyperesolveroptions",
        route: "/docs/api/interfaces/delegate_src.mergedtyperesolveroptions",
        frontMatter: {
          "sidebar_label": "Delegate Src.mergedtyperesolveroptions"
        }
      }, {
        name: "delegate_src.stitchinginfo",
        route: "/docs/api/interfaces/delegate_src.stitchinginfo",
        frontMatter: {
          "sidebar_label": "Delegate Src.stitchinginfo"
        }
      }, {
        name: "delegate_src.subschemaconfig",
        route: "/docs/api/interfaces/delegate_src.subschemaconfig",
        frontMatter: {
          "sidebar_label": "Delegate Src.subschemaconfig"
        }
      }, {
        name: "delegate_src.transform",
        route: "/docs/api/interfaces/delegate_src.transform",
        frontMatter: {
          "sidebar_label": "Delegate Src.transform"
        }
      }, {
        name: "executor_src.executionargs",
        route: "/docs/api/interfaces/executor_src.executionargs",
        frontMatter: {
          "sidebar_label": "Executor Src.executionargs"
        }
      }, {
        name: "executor_src.executioncontext",
        route: "/docs/api/interfaces/executor_src.executioncontext",
        frontMatter: {
          "sidebar_label": "Executor Src.executioncontext"
        }
      }, {
        name: "executor_src.formattedexecutionresult",
        route: "/docs/api/interfaces/executor_src.formattedexecutionresult",
        frontMatter: {
          "sidebar_label": "Executor Src.formattedexecutionresult"
        }
      }, {
        name: "executor_src.formattedincrementaldeferresult",
        route: "/docs/api/interfaces/executor_src.formattedincrementaldeferresult",
        frontMatter: {
          "sidebar_label": "Executor Src.formattedincrementaldeferresult"
        }
      }, {
        name: "executor_src.formattedincrementalstreamresult",
        route: "/docs/api/interfaces/executor_src.formattedincrementalstreamresult",
        frontMatter: {
          "sidebar_label": "Executor Src.formattedincrementalstreamresult"
        }
      }, {
        name: "executor_src.formattedinitialincrementalexecutionresult",
        route: "/docs/api/interfaces/executor_src.formattedinitialincrementalexecutionresult",
        frontMatter: {
          "sidebar_label": "Executor Src.formattedinitialincrementalexecutionresult"
        }
      }, {
        name: "executor_src.formattedsubsequentincrementalexecutionresult",
        route: "/docs/api/interfaces/executor_src.formattedsubsequentincrementalexecutionresult",
        frontMatter: {
          "sidebar_label": "Executor Src.formattedsubsequentincrementalexecutionresult"
        }
      }, {
        name: "executor_src.incrementaldeferresult",
        route: "/docs/api/interfaces/executor_src.incrementaldeferresult",
        frontMatter: {
          "sidebar_label": "Executor Src.incrementaldeferresult"
        }
      }, {
        name: "executor_src.incrementalexecutionresults",
        route: "/docs/api/interfaces/executor_src.incrementalexecutionresults",
        frontMatter: {
          "sidebar_label": "Executor Src.incrementalexecutionresults"
        }
      }, {
        name: "executor_src.incrementalstreamresult",
        route: "/docs/api/interfaces/executor_src.incrementalstreamresult",
        frontMatter: {
          "sidebar_label": "Executor Src.incrementalstreamresult"
        }
      }, {
        name: "executor_src.initialincrementalexecutionresult",
        route: "/docs/api/interfaces/executor_src.initialincrementalexecutionresult",
        frontMatter: {
          "sidebar_label": "Executor Src.initialincrementalexecutionresult"
        }
      }, {
        name: "executor_src.singularexecutionresult",
        route: "/docs/api/interfaces/executor_src.singularexecutionresult",
        frontMatter: {
          "sidebar_label": "Executor Src.singularexecutionresult"
        }
      }, {
        name: "executor_src.subsequentincrementalexecutionresult",
        route: "/docs/api/interfaces/executor_src.subsequentincrementalexecutionresult",
        frontMatter: {
          "sidebar_label": "Executor Src.subsequentincrementalexecutionresult"
        }
      }, {
        name: "executors_envelop_src.executorplugincontext",
        route: "/docs/api/interfaces/executors_envelop_src.executorplugincontext",
        frontMatter: {
          "sidebar_label": "Executors Envelop Src.executorplugincontext"
        }
      }, {
        name: "executors_http_src.httpexecutoroptions",
        route: "/docs/api/interfaces/executors_http_src.httpexecutoroptions",
        frontMatter: {
          "sidebar_label": "Executors HTTP Src.httpexecutoroptions"
        }
      }, {
        name: "executors_legacy_ws_src.legacywsexecutoropts",
        route: "/docs/api/interfaces/executors_legacy_ws_src.legacywsexecutoropts",
        frontMatter: {
          "sidebar_label": "Executors Legacy Ws Src.legacywsexecutoropts"
        }
      }, {
        name: "federation_src.getsubschemasfromsupergraphsdlopts",
        route: "/docs/api/interfaces/federation_src.getsubschemasfromsupergraphsdlopts",
        frontMatter: {
          "sidebar_label": "Federation Src.getsubschemasfromsupergraphsdlopts"
        }
      }, {
        name: "graphql_tag_pluck_src.graphqltagpluckoptions",
        route: "/docs/api/interfaces/graphql_tag_pluck_src.graphqltagpluckoptions",
        frontMatter: {
          "sidebar_label": "GraphQL Tag Pluck Src.graphqltagpluckoptions"
        }
      }, {
        name: "load_files_src.loadfilesoptions",
        route: "/docs/api/interfaces/load_files_src.loadfilesoptions",
        frontMatter: {
          "sidebar_label": "Load Files Src.loadfilesoptions"
        }
      }, {
        name: "loaders_apollo_engine_src.apolloengineoptions",
        route: "/docs/api/interfaces/loaders_apollo_engine_src.apolloengineoptions",
        frontMatter: {
          "sidebar_label": "Loaders Apollo Engine Src.apolloengineoptions"
        }
      }, {
        name: "loaders_github_src.githubloaderoptions",
        route: "/docs/api/interfaces/loaders_github_src.githubloaderoptions",
        frontMatter: {
          "sidebar_label": "Loaders GitHub Src.githubloaderoptions"
        }
      }, {
        name: "loaders_graphql_file_src.graphqlfileloaderoptions",
        route: "/docs/api/interfaces/loaders_graphql_file_src.graphqlfileloaderoptions",
        frontMatter: {
          "sidebar_label": "Loaders GraphQL File Src.graphqlfileloaderoptions"
        }
      }, {
        name: "loaders_json_file_src.jsonfileloaderoptions",
        route: "/docs/api/interfaces/loaders_json_file_src.jsonfileloaderoptions",
        frontMatter: {
          "sidebar_label": "Loaders Json File Src.jsonfileloaderoptions"
        }
      }, {
        name: "loaders_prisma_src.prismaloaderoptions",
        route: "/docs/api/interfaces/loaders_prisma_src.prismaloaderoptions",
        frontMatter: {
          "sidebar_label": "Loaders Prisma Src.prismaloaderoptions"
        }
      }, {
        name: "loaders_url_src.loadfromurloptions",
        route: "/docs/api/interfaces/loaders_url_src.loadfromurloptions",
        frontMatter: {
          "sidebar_label": "Loaders URL Src.loadfromurloptions"
        }
      }, {
        name: "merge_src.config",
        route: "/docs/api/interfaces/merge_src.config",
        frontMatter: {
          "sidebar_label": "Merge Src.config"
        }
      }, {
        name: "merge_src.mergeresolversoptions",
        route: "/docs/api/interfaces/merge_src.mergeresolversoptions",
        frontMatter: {
          "sidebar_label": "Merge Src.mergeresolversoptions"
        }
      }, {
        name: "mock_src.imockserver",
        route: "/docs/api/interfaces/mock_src.imockserver",
        frontMatter: {
          "sidebar_label": "Mock Src.imockserver"
        }
      }, {
        name: "mock_src.imockstore",
        route: "/docs/api/interfaces/mock_src.imockstore",
        frontMatter: {
          "sidebar_label": "Mock Src.imockstore"
        }
      }, {
        name: "schema_src.graphqlschemawithcontext",
        route: "/docs/api/interfaces/schema_src.graphqlschemawithcontext",
        frontMatter: {
          "sidebar_label": "Schema Src.graphqlschemawithcontext"
        }
      }, {
        name: "schema_src.iexecutableschemadefinition",
        route: "/docs/api/interfaces/schema_src.iexecutableschemadefinition",
        frontMatter: {
          "sidebar_label": "Schema Src.iexecutableschemadefinition"
        }
      }, {
        name: "stitch_src.istitchschemasoptions",
        route: "/docs/api/interfaces/stitch_src.istitchschemasoptions",
        frontMatter: {
          "sidebar_label": "Stitch Src.istitchschemasoptions"
        }
      }, {
        name: "stitch_src.mergeenumvalueconfigcandidate",
        route: "/docs/api/interfaces/stitch_src.mergeenumvalueconfigcandidate",
        frontMatter: {
          "sidebar_label": "Stitch Src.mergeenumvalueconfigcandidate"
        }
      }, {
        name: "stitch_src.mergefieldconfigcandidate",
        route: "/docs/api/interfaces/stitch_src.mergefieldconfigcandidate",
        frontMatter: {
          "sidebar_label": "Stitch Src.mergefieldconfigcandidate"
        }
      }, {
        name: "stitch_src.mergeinputfieldconfigcandidate",
        route: "/docs/api/interfaces/stitch_src.mergeinputfieldconfigcandidate",
        frontMatter: {
          "sidebar_label": "Stitch Src.mergeinputfieldconfigcandidate"
        }
      }, {
        name: "stitch_src.mergetypecandidate",
        route: "/docs/api/interfaces/stitch_src.mergetypecandidate",
        frontMatter: {
          "sidebar_label": "Stitch Src.mergetypecandidate"
        }
      }, {
        name: "stitch_src.typemergingoptions",
        route: "/docs/api/interfaces/stitch_src.typemergingoptions",
        frontMatter: {
          "sidebar_label": "Stitch Src.typemergingoptions"
        }
      }, {
        name: "stitch_src.validationsettings",
        route: "/docs/api/interfaces/stitch_src.validationsettings",
        frontMatter: {
          "sidebar_label": "Stitch Src.validationsettings"
        }
      }, {
        name: "stitching_directives_src.expansion",
        route: "/docs/api/interfaces/stitching_directives_src.expansion",
        frontMatter: {
          "sidebar_label": "Stitching Directives Src.expansion"
        }
      }, {
        name: "stitching_directives_src.mappinginstruction",
        route: "/docs/api/interfaces/stitching_directives_src.mappinginstruction",
        frontMatter: {
          "sidebar_label": "Stitching Directives Src.mappinginstruction"
        }
      }, {
        name: "stitching_directives_src.mergedtyperesolverinfo",
        route: "/docs/api/interfaces/stitching_directives_src.mergedtyperesolverinfo",
        frontMatter: {
          "sidebar_label": "Stitching Directives Src.mergedtyperesolverinfo"
        }
      }, {
        name: "stitching_directives_src.parsedmergeargsexpr",
        route: "/docs/api/interfaces/stitching_directives_src.parsedmergeargsexpr",
        frontMatter: {
          "sidebar_label": "Stitching Directives Src.parsedmergeargsexpr"
        }
      }, {
        name: "stitching_directives_src.propertytree",
        route: "/docs/api/interfaces/stitching_directives_src.propertytree",
        frontMatter: {
          "sidebar_label": "Stitching Directives Src.propertytree"
        }
      }, {
        name: "stitching_directives_src.stitchingdirectivesoptions",
        route: "/docs/api/interfaces/stitching_directives_src.stitchingdirectivesoptions",
        frontMatter: {
          "sidebar_label": "Stitching Directives Src.stitchingdirectivesoptions"
        }
      }, {
        name: "stitching_directives_src.stitchingdirectivesresult",
        route: "/docs/api/interfaces/stitching_directives_src.stitchingdirectivesresult",
        frontMatter: {
          "sidebar_label": "Stitching Directives Src.stitchingdirectivesresult"
        }
      }, {
        name: "utils_src.directiveannotation",
        route: "/docs/api/interfaces/utils_src.directiveannotation",
        frontMatter: {
          "sidebar_label": "Utils Src.directiveannotation"
        }
      }, {
        name: "utils_src.executionrequest",
        route: "/docs/api/interfaces/utils_src.executionrequest",
        frontMatter: {
          "sidebar_label": "Utils Src.executionrequest"
        }
      }, {
        name: "utils_src.executionresult",
        route: "/docs/api/interfaces/utils_src.executionresult",
        frontMatter: {
          "sidebar_label": "Utils Src.executionresult"
        }
      }, {
        name: "utils_src.fieldsandpatches",
        route: "/docs/api/interfaces/utils_src.fieldsandpatches",
        frontMatter: {
          "sidebar_label": "Utils Src.fieldsandpatches"
        }
      }, {
        name: "utils_src.getdocumentnodefromschemaoptions",
        route: "/docs/api/interfaces/utils_src.getdocumentnodefromschemaoptions",
        frontMatter: {
          "sidebar_label": "Utils Src.getdocumentnodefromschemaoptions"
        }
      }, {
        name: "utils_src.graphqlparseoptions",
        route: "/docs/api/interfaces/utils_src.graphqlparseoptions",
        frontMatter: {
          "sidebar_label": "Utils Src.graphqlparseoptions"
        }
      }, {
        name: "utils_src.iaddresolverstoschemaoptions",
        route: "/docs/api/interfaces/utils_src.iaddresolverstoschemaoptions",
        frontMatter: {
          "sidebar_label": "Utils Src.iaddresolverstoschemaoptions"
        }
      }, {
        name: "utils_src.ifieldresolveroptions",
        route: "/docs/api/interfaces/utils_src.ifieldresolveroptions",
        frontMatter: {
          "sidebar_label": "Utils Src.ifieldresolveroptions"
        }
      }, {
        name: "utils_src.iresolvervalidationoptions",
        route: "/docs/api/interfaces/utils_src.iresolvervalidationoptions",
        frontMatter: {
          "sidebar_label": "Utils Src.iresolvervalidationoptions"
        }
      }, {
        name: "utils_src.loader",
        route: "/docs/api/interfaces/utils_src.loader",
        frontMatter: {
          "sidebar_label": "Utils Src.loader"
        }
      }, {
        name: "utils_src.observable",
        route: "/docs/api/interfaces/utils_src.observable",
        frontMatter: {
          "sidebar_label": "Utils Src.observable"
        }
      }, {
        name: "utils_src.observer",
        route: "/docs/api/interfaces/utils_src.observer",
        frontMatter: {
          "sidebar_label": "Utils Src.observer"
        }
      }, {
        name: "utils_src.patchfields",
        route: "/docs/api/interfaces/utils_src.patchfields",
        frontMatter: {
          "sidebar_label": "Utils Src.patchfields"
        }
      }, {
        name: "utils_src.path",
        route: "/docs/api/interfaces/utils_src.path",
        frontMatter: {
          "sidebar_label": "Utils Src.path"
        }
      }, {
        name: "utils_src.pruneschemaoptions",
        route: "/docs/api/interfaces/utils_src.pruneschemaoptions",
        frontMatter: {
          "sidebar_label": "Utils Src.pruneschemaoptions"
        }
      }, {
        name: "utils_src.schemamapper",
        route: "/docs/api/interfaces/utils_src.schemamapper",
        frontMatter: {
          "sidebar_label": "Utils Src.schemamapper"
        }
      }, {
        name: "utils_src.schemaprintoptions",
        route: "/docs/api/interfaces/utils_src.schemaprintoptions",
        frontMatter: {
          "sidebar_label": "Utils Src.schemaprintoptions"
        }
      }, {
        name: "utils_src.source",
        route: "/docs/api/interfaces/utils_src.source",
        frontMatter: {
          "sidebar_label": "Utils Src.source"
        }
      }]
    }, {
      name: "modules",
      route: "/docs/api/modules",
      children: [{
        data: docs_api_modules_meta
      }, {
        name: "batch_delegate_src",
        route: "/docs/api/modules/batch_delegate_src",
        frontMatter: {
          "sidebar_label": "Batch Delegate Src"
        }
      }, {
        name: "batch_execute_src",
        route: "/docs/api/modules/batch_execute_src",
        frontMatter: {
          "sidebar_label": "Batch Execute Src"
        }
      }, {
        name: "delegate_src",
        route: "/docs/api/modules/delegate_src",
        frontMatter: {
          "sidebar_label": "Delegate Src"
        }
      }, {
        name: "documents_src",
        route: "/docs/api/modules/documents_src",
        frontMatter: {
          "sidebar_label": "Documents Src"
        }
      }, {
        name: "executor_src",
        route: "/docs/api/modules/executor_src",
        frontMatter: {
          "sidebar_label": "Executor Src"
        }
      }, {
        name: "executors_apollo_link_src",
        route: "/docs/api/modules/executors_apollo_link_src",
        frontMatter: {
          "sidebar_label": "Executors Apollo Link Src"
        }
      }, {
        name: "executors_envelop_src",
        route: "/docs/api/modules/executors_envelop_src",
        frontMatter: {
          "sidebar_label": "Executors Envelop Src"
        }
      }, {
        name: "executors_graphql_ws_src",
        route: "/docs/api/modules/executors_graphql_ws_src",
        frontMatter: {
          "sidebar_label": "Executors GraphQL Ws Src"
        }
      }, {
        name: "executors_http_src",
        route: "/docs/api/modules/executors_http_src",
        frontMatter: {
          "sidebar_label": "Executors HTTP Src"
        }
      }, {
        name: "executors_legacy_ws_src",
        route: "/docs/api/modules/executors_legacy_ws_src",
        frontMatter: {
          "sidebar_label": "Executors Legacy Ws Src"
        }
      }, {
        name: "executors_urql_exchange_src",
        route: "/docs/api/modules/executors_urql_exchange_src",
        frontMatter: {
          "sidebar_label": "Executors Urql Exchange Src"
        }
      }, {
        name: "executors_yoga_src",
        route: "/docs/api/modules/executors_yoga_src",
        frontMatter: {
          "sidebar_label": "Executors Yoga Src"
        }
      }, {
        name: "federation_src",
        route: "/docs/api/modules/federation_src",
        frontMatter: {
          "sidebar_label": "Federation Src"
        }
      }, {
        name: "graphql_tag_pluck_src",
        route: "/docs/api/modules/graphql_tag_pluck_src",
        frontMatter: {
          "sidebar_label": "GraphQL Tag Pluck Src"
        }
      }, {
        name: "import_src",
        route: "/docs/api/modules/import_src",
        frontMatter: {
          "sidebar_label": "Import Src"
        }
      }, {
        name: "inspect_src",
        route: "/docs/api/modules/inspect_src",
        frontMatter: {
          "sidebar_label": "Inspect Src"
        }
      }, {
        name: "jest_transform_src",
        route: "/docs/api/modules/jest_transform_src",
        frontMatter: {
          "sidebar_label": "Jest Transform Src"
        }
      }, {
        name: "links_src",
        route: "/docs/api/modules/links_src",
        frontMatter: {
          "sidebar_label": "Links Src"
        }
      }, {
        name: "load_files_src",
        route: "/docs/api/modules/load_files_src",
        frontMatter: {
          "sidebar_label": "Load Files Src"
        }
      }, {
        name: "load_src",
        route: "/docs/api/modules/load_src",
        frontMatter: {
          "sidebar_label": "Load Src"
        }
      }, {
        name: "loaders_apollo_engine_src",
        route: "/docs/api/modules/loaders_apollo_engine_src",
        frontMatter: {
          "sidebar_label": "Loaders Apollo Engine Src"
        }
      }, {
        name: "loaders_code_file_src",
        route: "/docs/api/modules/loaders_code_file_src",
        frontMatter: {
          "sidebar_label": "Loaders Code File Src"
        }
      }, {
        name: "loaders_git_src",
        route: "/docs/api/modules/loaders_git_src",
        frontMatter: {
          "sidebar_label": "Loaders Git Src"
        }
      }, {
        name: "loaders_github_src",
        route: "/docs/api/modules/loaders_github_src",
        frontMatter: {
          "sidebar_label": "Loaders GitHub Src"
        }
      }, {
        name: "loaders_graphql_file_src",
        route: "/docs/api/modules/loaders_graphql_file_src",
        frontMatter: {
          "sidebar_label": "Loaders GraphQL File Src"
        }
      }, {
        name: "loaders_json_file_src",
        route: "/docs/api/modules/loaders_json_file_src",
        frontMatter: {
          "sidebar_label": "Loaders Json File Src"
        }
      }, {
        name: "loaders_module_src",
        route: "/docs/api/modules/loaders_module_src",
        frontMatter: {
          "sidebar_label": "Loaders Module Src"
        }
      }, {
        name: "loaders_prisma_src",
        route: "/docs/api/modules/loaders_prisma_src",
        frontMatter: {
          "sidebar_label": "Loaders Prisma Src"
        }
      }, {
        name: "loaders_url_src",
        route: "/docs/api/modules/loaders_url_src",
        frontMatter: {
          "sidebar_label": "Loaders URL Src"
        }
      }, {
        name: "merge_src",
        route: "/docs/api/modules/merge_src",
        frontMatter: {
          "sidebar_label": "Merge Src"
        }
      }, {
        name: "mock_src",
        route: "/docs/api/modules/mock_src",
        frontMatter: {
          "sidebar_label": "Mock Src"
        }
      }, {
        name: "node_require_src",
        route: "/docs/api/modules/node_require_src",
        frontMatter: {
          "sidebar_label": "Node Require Src"
        }
      }, {
        name: "optimize_src",
        route: "/docs/api/modules/optimize_src",
        frontMatter: {
          "sidebar_label": "Optimize Src"
        }
      }, {
        name: "relay_operation_optimizer_src",
        route: "/docs/api/modules/relay_operation_optimizer_src",
        frontMatter: {
          "sidebar_label": "Relay Operation Optimizer Src"
        }
      }, {
        name: "resolvers_composition_src",
        route: "/docs/api/modules/resolvers_composition_src",
        frontMatter: {
          "sidebar_label": "Resolvers Composition Src"
        }
      }, {
        name: "schema_src",
        route: "/docs/api/modules/schema_src",
        frontMatter: {
          "sidebar_label": "Schema Src"
        }
      }, {
        name: "stitch_src",
        route: "/docs/api/modules/stitch_src",
        frontMatter: {
          "sidebar_label": "Stitch Src"
        }
      }, {
        name: "stitching_directives_src",
        route: "/docs/api/modules/stitching_directives_src",
        frontMatter: {
          "sidebar_label": "Stitching Directives Src"
        }
      }, {
        name: "utils_src",
        route: "/docs/api/modules/utils_src",
        frontMatter: {
          "sidebar_label": "Utils Src"
        }
      }, {
        name: "webpack_loader_runtime_src",
        route: "/docs/api/modules/webpack_loader_runtime_src",
        frontMatter: {
          "sidebar_label": "Webpack Loader Runtime Src"
        }
      }, {
        name: "webpack_loader_src",
        route: "/docs/api/modules/webpack_loader_src",
        frontMatter: {
          "sidebar_label": "Webpack Loader Src"
        }
      }, {
        name: "wrap_src",
        route: "/docs/api/modules/wrap_src",
        frontMatter: {
          "sidebar_label": "Wrap Src"
        }
      }]
    }, {
      name: "README",
      route: "/docs/api/README",
      frontMatter: {
        "sidebar_label": "Readme"
      }
    }]
  }, {
    name: "connectors",
    route: "/docs/connectors",
    frontMatter: {
      "sidebar_label": "Connectors",
      "description": "How to fetch data from your GraphQL resolvers."
    }
  }, {
    name: "documents-loading",
    route: "/docs/documents-loading",
    frontMatter: {
      "sidebar_label": "Documents Loading"
    }
  }, {
    name: "generate-schema",
    route: "/docs/generate-schema",
    frontMatter: {
      "sidebar_label": "Generate Schema",
      "description": "Generate a GraphQL schema from the concise type definition language."
    }
  }, {
    name: "graphql-tag-pluck",
    route: "/docs/graphql-tag-pluck",
    frontMatter: {
      "sidebar_label": "GraphQL Tag Pluck"
    }
  }, {
    name: "introduction",
    route: "/docs/introduction",
    frontMatter: {
      "sidebar_label": "Introduction",
      "description": "A set of utilities to build your JavaScript GraphQL schema in a concise and powerful way."
    }
  }, {
    name: "migration",
    route: "/docs/migration",
    children: [{
      data: docs_migration_meta
    }, {
      name: "migration-from-import",
      route: "/docs/migration/migration-from-import",
      frontMatter: {
        "sidebar_label": "Migration from Import"
      }
    }, {
      name: "migration-from-merge-graphql-schemas",
      route: "/docs/migration/migration-from-merge-graphql-schemas",
      frontMatter: {
        "sidebar_label": "Migration from Merge GraphQL Schemas"
      }
    }, {
      name: "migration-from-toolkit",
      route: "/docs/migration/migration-from-toolkit",
      frontMatter: {
        "sidebar_label": "Migration from Toolkit"
      }
    }, {
      name: "migration-from-tools",
      route: "/docs/migration/migration-from-tools",
      frontMatter: {
        "sidebar_label": "Migration from Tools"
      }
    }]
  }, {
    name: "mocking",
    route: "/docs/mocking",
    frontMatter: {
      "sidebar_label": "Mocking",
      "description": "Mock your GraphQL data based on a schema."
    }
  }, {
    name: "relay-operation-optimizer",
    route: "/docs/relay-operation-optimizer",
    frontMatter: {
      "sidebar_label": "Relay Operation Optimizer"
    }
  }, {
    name: "resolvers-composition",
    route: "/docs/resolvers-composition",
    frontMatter: {
      "sidebar_label": "Resolvers Composition"
    }
  }, {
    name: "resolvers",
    route: "/docs/resolvers",
    frontMatter: {
      "sidebar_label": "Resolvers",
      "description": "Writing resolvers with graphql-tools"
    }
  }, {
    name: "scalars",
    route: "/docs/scalars",
    frontMatter: {
      "sidebar_label": "Scalars",
      "description": "Add custom scalar and enum types to your graphql-tools generated schema."
    }
  }, {
    name: "schema-directives",
    route: "/docs/schema-directives",
    frontMatter: {
      "sidebar_label": "Schema Directives",
      "description": "Using and implementing custom directives to transform schema types, fields, and arguments"
    }
  }, {
    name: "schema-loading",
    route: "/docs/schema-loading",
    frontMatter: {
      "sidebar_label": "Schema Loading"
    }
  }, {
    name: "schema-merging",
    route: "/docs/schema-merging",
    frontMatter: {
      "sidebar_label": "Schema Merging"
    }
  }, {
    name: "server-setup",
    route: "/docs/server-setup",
    frontMatter: {
      "sidebar_label": "Server Setup"
    }
  }]
}, {
  name: "index",
  route: "/",
  frontMatter: {
    "sidebar_label": "Index",
    "title": "Home"
  }
}];