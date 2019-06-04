'use strict';

const BbPromise = require('bluebird');
const path = require('path');
const fse = require('fs-extra');
const yaml = require('write-yaml');
const ejs = require('ejs');
const inquirer = require('inquirer');

const functionTemplateFile = path.join('templates', 'function-template.ejs');
const requestTemplateFile = path.join('templates', 'request-template.ejs');

const capitalize = function (s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const createAWSNodeJSFuncFile = (serverless, resolver) => {
  const handlerInfo = {
    dir: resolver.type,
    name: resolver.field,
  };

  const handlerDir = path.join(serverless.config.servicePath, handlerInfo.dir);
  const handlerFile = `${handlerInfo.name}.js`;
  let templateFile = path.join(__dirname, functionTemplateFile);

  if (serverless.service.custom
    && serverless.service.custom['serverless-jest-plugin']
    && serverless.service.custom['serverless-jest-plugin'].functionTemplate) {
    templateFile = path.join(serverless.config.servicePath,
      serverless.service.custom['serverless-jest-plugin'].functionTemplate);
  }

  const templateText = fse.readFileSync(templateFile).toString();
  const jsFile = ejs.render(templateText);

  const filePath = path.join(handlerDir, handlerFile);

  serverless.utils.writeFileDir(filePath);
  if (serverless.utils.fileExistsSync(filePath)) {
    const errorMessage = [
      `File "${filePath}" already exists. Cannot create function.`,
    ].join('');
    throw new serverless.classes.Error(errorMessage);
  }
  fse.writeFileSync(path.join(handlerDir, handlerFile), jsFile);

  const functionDir = handlerDir
    .replace(`${process.cwd()}/`, '');

  serverless.cli.log(`Created function file ${path.join(functionDir, handlerFile)}`);
  return BbPromise.resolve();
};

const createRequestTemplateFile = (serverless, resolver) => {
  const handlerDir = path.join(serverless.config.servicePath, 'mapping-templates');
  const handlerFile = `${capitalize(resolver.type)}-${resolver.field}-request.vtl`;
  let templateFile = path.join(__dirname, requestTemplateFile);

  if (serverless.service.custom
    && serverless.service.custom['serverless-jest-plugin']
    && serverless.service.custom['serverless-jest-plugin'].requestTemplate) {
    templateFile = path.join(serverless.config.servicePath,
      serverless.service.custom['serverless-jest-plugin'].requestTemplate);
  }

  const templateText = fse.readFileSync(templateFile).toString();
  const vtlFile = ejs.render(templateText, {
    field: resolver.field,
  });

  const filePath = path.join(handlerDir, handlerFile);

  serverless.utils.writeFileDir(filePath);
  if (serverless.utils.fileExistsSync(filePath)) {
    const errorMessage = [
      `File "${filePath}" already exists. Cannot create function.`,
    ].join('');
    throw new serverless.classes.Error(errorMessage);
  }
  fse.writeFileSync(path.join(handlerDir, handlerFile), vtlFile);

  const functionDir = handlerDir
    .replace(`${process.cwd()}/`, '');

  serverless.cli.log(`Created function file ${path.join(functionDir, handlerFile)}`);
  return BbPromise.resolve();
};

const createSchemaFile = (serverless, resolver) => {
  if (resolver.type === 'Function') {
    return BbPromise.resolve();
  }

  const handlerInfo = {
    dir: resolver.type,
    name: resolver.field,
  };

  const resolverUnitType = resolver.unitName;
  const handlerDir = path.join(serverless.config.servicePath, 'schema');
  const handlerFile = `${handlerInfo.dir}-${handlerInfo.name}.graphql`;

  const resolverLine = resolver.type === 'Mutation'
    ? `${resolver.field}(input: ${resolverUnitType}Input!): ${resolverUnitType}`
    : `${resolver.field}: ${resolverUnitType}`;

  const typeInput = resolver.type === 'Mutation'
    ? `input ${resolverUnitType}Input {\n}\n\n`
    : '';

  const schemaContent = `${typeInput}`
    + `type ${resolverUnitType} {\n`
    + '  id: ID\n'
    + '}\n'
    + '\n'
    + `type ${capitalize(resolver.type)} {\n`
    + `  ${resolverLine}\n`
    + '}\n';

  const filePath = path.join(handlerDir, handlerFile);

  serverless.utils.writeFileDir(filePath);
  if (serverless.utils.fileExistsSync(filePath)) {
    const errorMessage = [
      `File "${filePath}" already exists.Cannot create schema.`,
    ].join('');
    throw new serverless.classes.Error(errorMessage);
  }
  fse.writeFileSync(path.join(handlerDir, handlerFile), schemaContent);

  const functionDir = handlerDir
    .replace(`${process.cwd()} /`, '');

  serverless.cli.log(`Created schema file ${path.join(functionDir, handlerFile)}`);
  return BbPromise.resolve();
};

const createResolver = (serverless, options) => {
  serverless.cli.log('Generating resolver / function...');
  const resolverTypeOpt = options.type;
  const resolverNameOpt = options.name;

  const resolversYmlFilePath = path
    .join(serverless.config.servicePath, 'resolvers.yml');

  // const resolversYmlFileContent = fse
  //   .readFileSync(resolversYmlFilePath).toString();

  const prompts = [];
  let resolverConfig = {};

  if (!resolverTypeOpt) {
    prompts.push({
      type: 'list',
      name: 'resolverType',
      message: 'Resolver type',
      choices: [
        'query',
        'mutation',
        'function',
      ],
    });
  }
  if (!resolverNameOpt) {
    prompts.push({
      type: 'input',
      name: 'resolverName',
      message: 'Resolver name (e.g. createPost, deletePost, listPosts)',
    });
  }
  prompts.push({
    type: 'input',
    name: 'resolverUnitName',
    message: 'Name of single unit (e.g. Post, User, Car). Leave empty for Function',
  });

  return inquirer
    .prompt(prompts)
    .then(answers => (
      {
        resolverName: answers.resolverName || resolverNameOpt,
        resolverType: answers.resolverType || resolverTypeOpt,
        resolverUnitName: answers.resolverUnitName,
      }
    )).then(({ resolverName, resolverType, resolverUnitName }) => {
      resolverConfig = { resolverName, resolverType, resolverUnitName };

      return serverless.yamlParser.parse(resolversYmlFilePath)
        .then((config) => {
          const resolver = {
            type: capitalize(resolverType),
            field: resolverName,
            dataSource: options.datasource || 'Lambda',
            request: `${capitalize(resolverType)}-${resolverName}-request.vtl`,
            response: 'common-response.vtl',
            unitName: resolverUnitName,
          };

          if (config.mappingTemplates.findIndex(i => i.field === resolverName) !== -1) {
            const errorMessage = [
              `Resolver "${resolverName}" already exists. Creation aborted.`,
            ].join('');
            throw new serverless.classes.Error(errorMessage);
          }


          config.mappingTemplates.push(resolver);

          yaml.sync(resolversYmlFilePath, config);

          return BbPromise.all([
            createAWSNodeJSFuncFile(serverless, resolver),
            createRequestTemplateFile(serverless, resolver),
            createSchemaFile(serverless, resolver),
          ]);
        });
    }).then(() => resolverConfig);
};

module.exports = createResolver;
