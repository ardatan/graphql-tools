
import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';
export default [
{
  path: '/',
  component: ComponentCreator('/','deb'),
  exact: true,
},
{
  path: '/__docusaurus/debug',
  component: ComponentCreator('/__docusaurus/debug','3d6'),
  exact: true,
},
{
  path: '/__docusaurus/debug/config',
  component: ComponentCreator('/__docusaurus/debug/config','914'),
  exact: true,
},
{
  path: '/__docusaurus/debug/content',
  component: ComponentCreator('/__docusaurus/debug/content','c28'),
  exact: true,
},
{
  path: '/__docusaurus/debug/globalData',
  component: ComponentCreator('/__docusaurus/debug/globalData','3cf'),
  exact: true,
},
{
  path: '/__docusaurus/debug/metadata',
  component: ComponentCreator('/__docusaurus/debug/metadata','31b'),
  exact: true,
},
{
  path: '/__docusaurus/debug/registry',
  component: ComponentCreator('/__docusaurus/debug/registry','0da'),
  exact: true,
},
{
  path: '/__docusaurus/debug/routes',
  component: ComponentCreator('/__docusaurus/debug/routes','244'),
  exact: true,
},
{
  path: '/search',
  component: ComponentCreator('/search','3b1'),
  exact: true,
},
{
  path: '/docs',
  component: ComponentCreator('/docs','2ba'),
  
  routes: [
{
  path: '/docs/api/classes/delegate_src.addargumentsasvariables',
  component: ComponentCreator('/docs/api/classes/delegate_src.addargumentsasvariables','297'),
  exact: true,
},
{
  path: '/docs/api/classes/delegate_src.addselectionsets',
  component: ComponentCreator('/docs/api/classes/delegate_src.addselectionsets','391'),
  exact: true,
},
{
  path: '/docs/api/classes/delegate_src.addtypenametoabstract',
  component: ComponentCreator('/docs/api/classes/delegate_src.addtypenametoabstract','7e2'),
  exact: true,
},
{
  path: '/docs/api/classes/delegate_src.checkresultandhandleerrors',
  component: ComponentCreator('/docs/api/classes/delegate_src.checkresultandhandleerrors','c16'),
  exact: true,
},
{
  path: '/docs/api/classes/delegate_src.expandabstracttypes',
  component: ComponentCreator('/docs/api/classes/delegate_src.expandabstracttypes','4ec'),
  exact: true,
},
{
  path: '/docs/api/classes/delegate_src.filtertoschema',
  component: ComponentCreator('/docs/api/classes/delegate_src.filtertoschema','05b'),
  exact: true,
},
{
  path: '/docs/api/classes/delegate_src.subschema',
  component: ComponentCreator('/docs/api/classes/delegate_src.subschema','bd2'),
  exact: true,
},
{
  path: '/docs/api/classes/delegate_src.visitselectionsets',
  component: ComponentCreator('/docs/api/classes/delegate_src.visitselectionsets','620'),
  exact: true,
},
{
  path: '/docs/api/classes/links_src.awaitvariableslink',
  component: ComponentCreator('/docs/api/classes/links_src.awaitvariableslink','6e8'),
  exact: true,
},
{
  path: '/docs/api/classes/loaders_apollo_engine_src.apolloengineloader',
  component: ComponentCreator('/docs/api/classes/loaders_apollo_engine_src.apolloengineloader','e9d'),
  exact: true,
},
{
  path: '/docs/api/classes/loaders_code_file_src.codefileloader',
  component: ComponentCreator('/docs/api/classes/loaders_code_file_src.codefileloader','689'),
  exact: true,
},
{
  path: '/docs/api/classes/loaders_git_src.gitloader',
  component: ComponentCreator('/docs/api/classes/loaders_git_src.gitloader','427'),
  exact: true,
},
{
  path: '/docs/api/classes/loaders_github_src.githubloader',
  component: ComponentCreator('/docs/api/classes/loaders_github_src.githubloader','b91'),
  exact: true,
},
{
  path: '/docs/api/classes/loaders_graphql_file_src.graphqlfileloader',
  component: ComponentCreator('/docs/api/classes/loaders_graphql_file_src.graphqlfileloader','fae'),
  exact: true,
},
{
  path: '/docs/api/classes/loaders_json_file_src.jsonfileloader',
  component: ComponentCreator('/docs/api/classes/loaders_json_file_src.jsonfileloader','2d9'),
  exact: true,
},
{
  path: '/docs/api/classes/loaders_module_src.moduleloader',
  component: ComponentCreator('/docs/api/classes/loaders_module_src.moduleloader','31f'),
  exact: true,
},
{
  path: '/docs/api/classes/loaders_prisma_src.prismaloader',
  component: ComponentCreator('/docs/api/classes/loaders_prisma_src.prismaloader','e50'),
  exact: true,
},
{
  path: '/docs/api/classes/loaders_url_src.urlloader',
  component: ComponentCreator('/docs/api/classes/loaders_url_src.urlloader','e5d'),
  exact: true,
},
{
  path: '/docs/api/classes/mock_src.mocklist',
  component: ComponentCreator('/docs/api/classes/mock_src.mocklist','14f'),
  exact: true,
},
{
  path: '/docs/api/classes/mock_src.mockstore',
  component: ComponentCreator('/docs/api/classes/mock_src.mockstore','a2d'),
  exact: true,
},
{
  path: '/docs/api/classes/utils_src.schemadirectivevisitor',
  component: ComponentCreator('/docs/api/classes/utils_src.schemadirectivevisitor','d57'),
  exact: true,
},
{
  path: '/docs/api/classes/utils_src.schemavisitor',
  component: ComponentCreator('/docs/api/classes/utils_src.schemavisitor','e09'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.extractfield',
  component: ComponentCreator('/docs/api/classes/wrap_src.extractfield','458'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.filterinputobjectfields',
  component: ComponentCreator('/docs/api/classes/wrap_src.filterinputobjectfields','6ca'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.filterinterfacefields',
  component: ComponentCreator('/docs/api/classes/wrap_src.filterinterfacefields','409'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.filterobjectfielddirectives',
  component: ComponentCreator('/docs/api/classes/wrap_src.filterobjectfielddirectives','c63'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.filterobjectfields',
  component: ComponentCreator('/docs/api/classes/wrap_src.filterobjectfields','ae1'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.filterrootfields',
  component: ComponentCreator('/docs/api/classes/wrap_src.filterrootfields','e76'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.filtertypes',
  component: ComponentCreator('/docs/api/classes/wrap_src.filtertypes','590'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.hoistfield',
  component: ComponentCreator('/docs/api/classes/wrap_src.hoistfield','397'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.mapfields',
  component: ComponentCreator('/docs/api/classes/wrap_src.mapfields','655'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.mapleafvalues',
  component: ComponentCreator('/docs/api/classes/wrap_src.mapleafvalues','2b0'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.pruneschema',
  component: ComponentCreator('/docs/api/classes/wrap_src.pruneschema','3be'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.removeobjectfielddeprecations',
  component: ComponentCreator('/docs/api/classes/wrap_src.removeobjectfielddeprecations','7e8'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.removeobjectfielddirectives',
  component: ComponentCreator('/docs/api/classes/wrap_src.removeobjectfielddirectives','3d9'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.removeobjectfieldswithdeprecation',
  component: ComponentCreator('/docs/api/classes/wrap_src.removeobjectfieldswithdeprecation','6ee'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.removeobjectfieldswithdirective',
  component: ComponentCreator('/docs/api/classes/wrap_src.removeobjectfieldswithdirective','2cb'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.renameinputobjectfields',
  component: ComponentCreator('/docs/api/classes/wrap_src.renameinputobjectfields','024'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.renameinterfacefields',
  component: ComponentCreator('/docs/api/classes/wrap_src.renameinterfacefields','0d6'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.renameobjectfields',
  component: ComponentCreator('/docs/api/classes/wrap_src.renameobjectfields','76d'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.renamerootfields',
  component: ComponentCreator('/docs/api/classes/wrap_src.renamerootfields','527'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.renameroottypes',
  component: ComponentCreator('/docs/api/classes/wrap_src.renameroottypes','480'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.renametypes',
  component: ComponentCreator('/docs/api/classes/wrap_src.renametypes','d09'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.transformcompositefields',
  component: ComponentCreator('/docs/api/classes/wrap_src.transformcompositefields','ec9'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.transformenumvalues',
  component: ComponentCreator('/docs/api/classes/wrap_src.transformenumvalues','ede'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.transforminputobjectfields',
  component: ComponentCreator('/docs/api/classes/wrap_src.transforminputobjectfields','9e7'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.transforminterfacefields',
  component: ComponentCreator('/docs/api/classes/wrap_src.transforminterfacefields','280'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.transformobjectfields',
  component: ComponentCreator('/docs/api/classes/wrap_src.transformobjectfields','f16'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.transformquery',
  component: ComponentCreator('/docs/api/classes/wrap_src.transformquery','82a'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.transformrootfields',
  component: ComponentCreator('/docs/api/classes/wrap_src.transformrootfields','9a7'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.wrapfields',
  component: ComponentCreator('/docs/api/classes/wrap_src.wrapfields','2f3'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.wrapquery',
  component: ComponentCreator('/docs/api/classes/wrap_src.wrapquery','c2a'),
  exact: true,
},
{
  path: '/docs/api/classes/wrap_src.wraptype',
  component: ComponentCreator('/docs/api/classes/wrap_src.wraptype','49a'),
  exact: true,
},
{
  path: '/docs/api/enums/utils_src.mapperkind',
  component: ComponentCreator('/docs/api/enums/utils_src.mapperkind','fba'),
  exact: true,
},
{
  path: '/docs/api/enums/utils_src.visitschemakind',
  component: ComponentCreator('/docs/api/enums/utils_src.visitschemakind','f43'),
  exact: true,
},
{
  path: '/docs/api/interfaces/batch_delegate_src.batchdelegateoptions',
  component: ComponentCreator('/docs/api/interfaces/batch_delegate_src.batchdelegateoptions','e67'),
  exact: true,
},
{
  path: '/docs/api/interfaces/batch_delegate_src.createbatchdelegatefnoptions',
  component: ComponentCreator('/docs/api/interfaces/batch_delegate_src.createbatchdelegatefnoptions','8bd'),
  exact: true,
},
{
  path: '/docs/api/interfaces/delegate_src.batchingoptions',
  component: ComponentCreator('/docs/api/interfaces/delegate_src.batchingoptions','d99'),
  exact: true,
},
{
  path: '/docs/api/interfaces/delegate_src.delegationcontext',
  component: ComponentCreator('/docs/api/interfaces/delegate_src.delegationcontext','e1c'),
  exact: true,
},
{
  path: '/docs/api/interfaces/delegate_src.executionparams',
  component: ComponentCreator('/docs/api/interfaces/delegate_src.executionparams','9e4'),
  exact: true,
},
{
  path: '/docs/api/interfaces/delegate_src.externalobject',
  component: ComponentCreator('/docs/api/interfaces/delegate_src.externalobject','ead'),
  exact: true,
},
{
  path: '/docs/api/interfaces/delegate_src.icreateproxyingresolveroptions',
  component: ComponentCreator('/docs/api/interfaces/delegate_src.icreateproxyingresolveroptions','d55'),
  exact: true,
},
{
  path: '/docs/api/interfaces/delegate_src.icreaterequest',
  component: ComponentCreator('/docs/api/interfaces/delegate_src.icreaterequest','6eb'),
  exact: true,
},
{
  path: '/docs/api/interfaces/delegate_src.icreaterequestfrominfo',
  component: ComponentCreator('/docs/api/interfaces/delegate_src.icreaterequestfrominfo','79d'),
  exact: true,
},
{
  path: '/docs/api/interfaces/delegate_src.idelegaterequestoptions',
  component: ComponentCreator('/docs/api/interfaces/delegate_src.idelegaterequestoptions','3f1'),
  exact: true,
},
{
  path: '/docs/api/interfaces/delegate_src.idelegatetoschemaoptions',
  component: ComponentCreator('/docs/api/interfaces/delegate_src.idelegatetoschemaoptions','36e'),
  exact: true,
},
{
  path: '/docs/api/interfaces/delegate_src.mergedfieldconfig',
  component: ComponentCreator('/docs/api/interfaces/delegate_src.mergedfieldconfig','8ec'),
  exact: true,
},
{
  path: '/docs/api/interfaces/delegate_src.mergedtypeconfig',
  component: ComponentCreator('/docs/api/interfaces/delegate_src.mergedtypeconfig','dce'),
  exact: true,
},
{
  path: '/docs/api/interfaces/delegate_src.mergedtypeinfo',
  component: ComponentCreator('/docs/api/interfaces/delegate_src.mergedtypeinfo','9b8'),
  exact: true,
},
{
  path: '/docs/api/interfaces/delegate_src.mergedtyperesolveroptions',
  component: ComponentCreator('/docs/api/interfaces/delegate_src.mergedtyperesolveroptions','9ef'),
  exact: true,
},
{
  path: '/docs/api/interfaces/delegate_src.stitchinginfo',
  component: ComponentCreator('/docs/api/interfaces/delegate_src.stitchinginfo','550'),
  exact: true,
},
{
  path: '/docs/api/interfaces/delegate_src.subschemaconfig',
  component: ComponentCreator('/docs/api/interfaces/delegate_src.subschemaconfig','f82'),
  exact: true,
},
{
  path: '/docs/api/interfaces/delegate_src.transform',
  component: ComponentCreator('/docs/api/interfaces/delegate_src.transform','db8'),
  exact: true,
},
{
  path: '/docs/api/interfaces/graphql_tag_pluck_src.graphqltagpluckoptions',
  component: ComponentCreator('/docs/api/interfaces/graphql_tag_pluck_src.graphqltagpluckoptions','dd4'),
  exact: true,
},
{
  path: '/docs/api/interfaces/load_files_src.loadfilesoptions',
  component: ComponentCreator('/docs/api/interfaces/load_files_src.loadfilesoptions','b59'),
  exact: true,
},
{
  path: '/docs/api/interfaces/loaders_apollo_engine_src.apolloengineoptions',
  component: ComponentCreator('/docs/api/interfaces/loaders_apollo_engine_src.apolloengineoptions','02a'),
  exact: true,
},
{
  path: '/docs/api/interfaces/loaders_github_src.githubloaderoptions',
  component: ComponentCreator('/docs/api/interfaces/loaders_github_src.githubloaderoptions','b14'),
  exact: true,
},
{
  path: '/docs/api/interfaces/loaders_graphql_file_src.graphqlfileloaderoptions',
  component: ComponentCreator('/docs/api/interfaces/loaders_graphql_file_src.graphqlfileloaderoptions','e77'),
  exact: true,
},
{
  path: '/docs/api/interfaces/loaders_json_file_src.jsonfileloaderoptions',
  component: ComponentCreator('/docs/api/interfaces/loaders_json_file_src.jsonfileloaderoptions','582'),
  exact: true,
},
{
  path: '/docs/api/interfaces/loaders_prisma_src.prismaloaderoptions',
  component: ComponentCreator('/docs/api/interfaces/loaders_prisma_src.prismaloaderoptions','c49'),
  exact: true,
},
{
  path: '/docs/api/interfaces/loaders_url_src.loadfromurloptions',
  component: ComponentCreator('/docs/api/interfaces/loaders_url_src.loadfromurloptions','1be'),
  exact: true,
},
{
  path: '/docs/api/interfaces/merge_src.config',
  component: ComponentCreator('/docs/api/interfaces/merge_src.config','564'),
  exact: true,
},
{
  path: '/docs/api/interfaces/merge_src.mergeresolversoptions',
  component: ComponentCreator('/docs/api/interfaces/merge_src.mergeresolversoptions','f5a'),
  exact: true,
},
{
  path: '/docs/api/interfaces/merge_src.mergeschemasconfig',
  component: ComponentCreator('/docs/api/interfaces/merge_src.mergeschemasconfig','cb1'),
  exact: true,
},
{
  path: '/docs/api/interfaces/mock_src.imockserver',
  component: ComponentCreator('/docs/api/interfaces/mock_src.imockserver','132'),
  exact: true,
},
{
  path: '/docs/api/interfaces/mock_src.imockstore',
  component: ComponentCreator('/docs/api/interfaces/mock_src.imockstore','5b6'),
  exact: true,
},
{
  path: '/docs/api/interfaces/schema_src.iexecutableschemadefinition',
  component: ComponentCreator('/docs/api/interfaces/schema_src.iexecutableschemadefinition','0b7'),
  exact: true,
},
{
  path: '/docs/api/interfaces/schema_src.ilogger',
  component: ComponentCreator('/docs/api/interfaces/schema_src.ilogger','c84'),
  exact: true,
},
{
  path: '/docs/api/interfaces/stitching_directives_src.expansion',
  component: ComponentCreator('/docs/api/interfaces/stitching_directives_src.expansion','6f3'),
  exact: true,
},
{
  path: '/docs/api/interfaces/stitching_directives_src.keydeclaration',
  component: ComponentCreator('/docs/api/interfaces/stitching_directives_src.keydeclaration','7ac'),
  exact: true,
},
{
  path: '/docs/api/interfaces/stitching_directives_src.mergedtyperesolverinfo',
  component: ComponentCreator('/docs/api/interfaces/stitching_directives_src.mergedtyperesolverinfo','07c'),
  exact: true,
},
{
  path: '/docs/api/interfaces/stitching_directives_src.parsedmergeargsexpr',
  component: ComponentCreator('/docs/api/interfaces/stitching_directives_src.parsedmergeargsexpr','2e9'),
  exact: true,
},
{
  path: '/docs/api/interfaces/stitching_directives_src.propertytree',
  component: ComponentCreator('/docs/api/interfaces/stitching_directives_src.propertytree','f84'),
  exact: true,
},
{
  path: '/docs/api/interfaces/stitching_directives_src.stitchingdirectivesoptions',
  component: ComponentCreator('/docs/api/interfaces/stitching_directives_src.stitchingdirectivesoptions','139'),
  exact: true,
},
{
  path: '/docs/api/interfaces/utils_src.executionresult',
  component: ComponentCreator('/docs/api/interfaces/utils_src.executionresult','dee'),
  exact: true,
},
{
  path: '/docs/api/interfaces/utils_src.graphqlexecutioncontext',
  component: ComponentCreator('/docs/api/interfaces/utils_src.graphqlexecutioncontext','5fa'),
  exact: true,
},
{
  path: '/docs/api/interfaces/utils_src.graphqlparseoptions',
  component: ComponentCreator('/docs/api/interfaces/utils_src.graphqlparseoptions','92d'),
  exact: true,
},
{
  path: '/docs/api/interfaces/utils_src.iaddresolverstoschemaoptions',
  component: ComponentCreator('/docs/api/interfaces/utils_src.iaddresolverstoschemaoptions','e6b'),
  exact: true,
},
{
  path: '/docs/api/interfaces/utils_src.idirectiveresolvers',
  component: ComponentCreator('/docs/api/interfaces/utils_src.idirectiveresolvers','029'),
  exact: true,
},
{
  path: '/docs/api/interfaces/utils_src.ifieldresolveroptions',
  component: ComponentCreator('/docs/api/interfaces/utils_src.ifieldresolveroptions','0c2'),
  exact: true,
},
{
  path: '/docs/api/interfaces/utils_src.iresolvervalidationoptions',
  component: ComponentCreator('/docs/api/interfaces/utils_src.iresolvervalidationoptions','4f2'),
  exact: true,
},
{
  path: '/docs/api/interfaces/utils_src.loaddocumenterror',
  component: ComponentCreator('/docs/api/interfaces/utils_src.loaddocumenterror','6b6'),
  exact: true,
},
{
  path: '/docs/api/interfaces/utils_src.loader',
  component: ComponentCreator('/docs/api/interfaces/utils_src.loader','716'),
  exact: true,
},
{
  path: '/docs/api/interfaces/utils_src.observable',
  component: ComponentCreator('/docs/api/interfaces/utils_src.observable','557'),
  exact: true,
},
{
  path: '/docs/api/interfaces/utils_src.observer',
  component: ComponentCreator('/docs/api/interfaces/utils_src.observer','a5a'),
  exact: true,
},
{
  path: '/docs/api/interfaces/utils_src.printschemawithdirectivesoptions',
  component: ComponentCreator('/docs/api/interfaces/utils_src.printschemawithdirectivesoptions','1ba'),
  exact: true,
},
{
  path: '/docs/api/interfaces/utils_src.pruneschemaoptions',
  component: ComponentCreator('/docs/api/interfaces/utils_src.pruneschemaoptions','f1d'),
  exact: true,
},
{
  path: '/docs/api/interfaces/utils_src.request',
  component: ComponentCreator('/docs/api/interfaces/utils_src.request','7c5'),
  exact: true,
},
{
  path: '/docs/api/interfaces/utils_src.schemamapper',
  component: ComponentCreator('/docs/api/interfaces/utils_src.schemamapper','f6d'),
  exact: true,
},
{
  path: '/docs/api/interfaces/utils_src.schemaprintoptions',
  component: ComponentCreator('/docs/api/interfaces/utils_src.schemaprintoptions','bd9'),
  exact: true,
},
{
  path: '/docs/api/interfaces/utils_src.schemavisitormap',
  component: ComponentCreator('/docs/api/interfaces/utils_src.schemavisitormap','61a'),
  exact: true,
},
{
  path: '/docs/api/interfaces/utils_src.source',
  component: ComponentCreator('/docs/api/interfaces/utils_src.source','9b8'),
  exact: true,
},
{
  path: '/docs/api/interfaces/wrap_src.imakeremoteexecutableschemaoptions',
  component: ComponentCreator('/docs/api/interfaces/wrap_src.imakeremoteexecutableschemaoptions','7f7'),
  exact: true,
},
{
  path: '/docs/api/modules/apollo-engine-loader',
  component: ComponentCreator('/docs/api/modules/apollo-engine-loader','22d'),
  exact: true,
},
{
  path: '/docs/api/modules/batch-delegate',
  component: ComponentCreator('/docs/api/modules/batch-delegate','a3c'),
  exact: true,
},
{
  path: '/docs/api/modules/batch-execute',
  component: ComponentCreator('/docs/api/modules/batch-execute','fa8'),
  exact: true,
},
{
  path: '/docs/api/modules/code-file-loader',
  component: ComponentCreator('/docs/api/modules/code-file-loader','fbf'),
  exact: true,
},
{
  path: '/docs/api/modules/delegate',
  component: ComponentCreator('/docs/api/modules/delegate','4d6'),
  exact: true,
},
{
  path: '/docs/api/modules/git-loader',
  component: ComponentCreator('/docs/api/modules/git-loader','5ee'),
  exact: true,
},
{
  path: '/docs/api/modules/github-loader',
  component: ComponentCreator('/docs/api/modules/github-loader','820'),
  exact: true,
},
{
  path: '/docs/api/modules/graphql-file-loader',
  component: ComponentCreator('/docs/api/modules/graphql-file-loader','a00'),
  exact: true,
},
{
  path: '/docs/api/modules/graphql-tag-pluck',
  component: ComponentCreator('/docs/api/modules/graphql-tag-pluck','018'),
  exact: true,
},
{
  path: '/docs/api/modules/import',
  component: ComponentCreator('/docs/api/modules/import','aec'),
  exact: true,
},
{
  path: '/docs/api/modules/json-file-loader',
  component: ComponentCreator('/docs/api/modules/json-file-loader','25c'),
  exact: true,
},
{
  path: '/docs/api/modules/links',
  component: ComponentCreator('/docs/api/modules/links','d2b'),
  exact: true,
},
{
  path: '/docs/api/modules/load',
  component: ComponentCreator('/docs/api/modules/load','cba'),
  exact: true,
},
{
  path: '/docs/api/modules/load-files',
  component: ComponentCreator('/docs/api/modules/load-files','aad'),
  exact: true,
},
{
  path: '/docs/api/modules/merge',
  component: ComponentCreator('/docs/api/modules/merge','7d8'),
  exact: true,
},
{
  path: '/docs/api/modules/mock',
  component: ComponentCreator('/docs/api/modules/mock','877'),
  exact: true,
},
{
  path: '/docs/api/modules/module-loader',
  component: ComponentCreator('/docs/api/modules/module-loader','75e'),
  exact: true,
},
{
  path: '/docs/api/modules/node-require',
  component: ComponentCreator('/docs/api/modules/node-require','a27'),
  exact: true,
},
{
  path: '/docs/api/modules/optimize',
  component: ComponentCreator('/docs/api/modules/optimize','fea'),
  exact: true,
},
{
  path: '/docs/api/modules/prisma-loader',
  component: ComponentCreator('/docs/api/modules/prisma-loader','bbb'),
  exact: true,
},
{
  path: '/docs/api/modules/relay-operation-optimizer',
  component: ComponentCreator('/docs/api/modules/relay-operation-optimizer','6ef'),
  exact: true,
},
{
  path: '/docs/api/modules/resolvers-composition',
  component: ComponentCreator('/docs/api/modules/resolvers-composition','be6'),
  exact: true,
},
{
  path: '/docs/api/modules/schema',
  component: ComponentCreator('/docs/api/modules/schema','8bf'),
  exact: true,
},
{
  path: '/docs/api/modules/stitch',
  component: ComponentCreator('/docs/api/modules/stitch','833'),
  exact: true,
},
{
  path: '/docs/api/modules/stitching-directives',
  component: ComponentCreator('/docs/api/modules/stitching-directives','cc3'),
  exact: true,
},
{
  path: '/docs/api/modules/url-loader',
  component: ComponentCreator('/docs/api/modules/url-loader','fb3'),
  exact: true,
},
{
  path: '/docs/api/modules/utils',
  component: ComponentCreator('/docs/api/modules/utils','ef8'),
  exact: true,
},
{
  path: '/docs/api/modules/webpack-loader',
  component: ComponentCreator('/docs/api/modules/webpack-loader','372'),
  exact: true,
},
{
  path: '/docs/api/modules/webpack-loader-runtime',
  component: ComponentCreator('/docs/api/modules/webpack-loader-runtime','520'),
  exact: true,
},
{
  path: '/docs/api/modules/wrap',
  component: ComponentCreator('/docs/api/modules/wrap','492'),
  exact: true,
},
{
  path: '/docs/api/README',
  component: ComponentCreator('/docs/api/README','8b0'),
  exact: true,
},
{
  path: '/docs/connectors',
  component: ComponentCreator('/docs/connectors','296'),
  exact: true,
},
{
  path: '/docs/directive-resolvers',
  component: ComponentCreator('/docs/directive-resolvers','faa'),
  exact: true,
},
{
  path: '/docs/documents-loading',
  component: ComponentCreator('/docs/documents-loading','995'),
  exact: true,
},
{
  path: '/docs/generate-schema',
  component: ComponentCreator('/docs/generate-schema','358'),
  exact: true,
},
{
  path: '/docs/graphql-tag-pluck',
  component: ComponentCreator('/docs/graphql-tag-pluck','54e'),
  exact: true,
},
{
  path: '/docs/introduction',
  component: ComponentCreator('/docs/introduction','fca'),
  exact: true,
},
{
  path: '/docs/legacy-schema-directives',
  component: ComponentCreator('/docs/legacy-schema-directives','c49'),
  exact: true,
},
{
  path: '/docs/loaders',
  component: ComponentCreator('/docs/loaders','82b'),
  exact: true,
},
{
  path: '/docs/merge-resolvers',
  component: ComponentCreator('/docs/merge-resolvers','adc'),
  exact: true,
},
{
  path: '/docs/merge-schemas',
  component: ComponentCreator('/docs/merge-schemas','018'),
  exact: true,
},
{
  path: '/docs/merge-typedefs',
  component: ComponentCreator('/docs/merge-typedefs','f10'),
  exact: true,
},
{
  path: '/docs/migration-from-import',
  component: ComponentCreator('/docs/migration-from-import','639'),
  exact: true,
},
{
  path: '/docs/migration-from-merge-graphql-schemas',
  component: ComponentCreator('/docs/migration-from-merge-graphql-schemas','a8f'),
  exact: true,
},
{
  path: '/docs/migration-from-toolkit',
  component: ComponentCreator('/docs/migration-from-toolkit','110'),
  exact: true,
},
{
  path: '/docs/migration-from-tools',
  component: ComponentCreator('/docs/migration-from-tools','82e'),
  exact: true,
},
{
  path: '/docs/mocking',
  component: ComponentCreator('/docs/mocking','873'),
  exact: true,
},
{
  path: '/docs/relay-operation-optimizer',
  component: ComponentCreator('/docs/relay-operation-optimizer','8c6'),
  exact: true,
},
{
  path: '/docs/remote-schemas',
  component: ComponentCreator('/docs/remote-schemas','966'),
  exact: true,
},
{
  path: '/docs/resolvers',
  component: ComponentCreator('/docs/resolvers','6b1'),
  exact: true,
},
{
  path: '/docs/resolvers-composition',
  component: ComponentCreator('/docs/resolvers-composition','28a'),
  exact: true,
},
{
  path: '/docs/scalars',
  component: ComponentCreator('/docs/scalars','bfa'),
  exact: true,
},
{
  path: '/docs/schema-delegation',
  component: ComponentCreator('/docs/schema-delegation','2fe'),
  exact: true,
},
{
  path: '/docs/schema-directives',
  component: ComponentCreator('/docs/schema-directives','c57'),
  exact: true,
},
{
  path: '/docs/schema-loading',
  component: ComponentCreator('/docs/schema-loading','1c9'),
  exact: true,
},
{
  path: '/docs/schema-merging',
  component: ComponentCreator('/docs/schema-merging','82a'),
  exact: true,
},
{
  path: '/docs/schema-stitching',
  component: ComponentCreator('/docs/schema-stitching','540'),
  exact: true,
},
{
  path: '/docs/schema-wrapping',
  component: ComponentCreator('/docs/schema-wrapping','4de'),
  exact: true,
},
{
  path: '/docs/server-setup',
  component: ComponentCreator('/docs/server-setup','61e'),
  exact: true,
},
{
  path: '/docs/stitch-api',
  component: ComponentCreator('/docs/stitch-api','ac8'),
  exact: true,
},
{
  path: '/docs/stitch-combining-schemas',
  component: ComponentCreator('/docs/stitch-combining-schemas','b8f'),
  exact: true,
},
{
  path: '/docs/stitch-directives-sdl',
  component: ComponentCreator('/docs/stitch-directives-sdl','7e5'),
  exact: true,
},
{
  path: '/docs/stitch-schema-extensions',
  component: ComponentCreator('/docs/stitch-schema-extensions','4d3'),
  exact: true,
},
{
  path: '/docs/stitch-type-merging',
  component: ComponentCreator('/docs/stitch-type-merging','2cd'),
  exact: true,
},
]
},
{
  path: '*',
  component: ComponentCreator('*')
}
];
