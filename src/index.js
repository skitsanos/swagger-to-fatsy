#!/usr/bin/env node
const {program} = require('commander');
const {version} = require('../package.json');
const {resolve, join: pathJoin} = require('path');
const {existsSync} = require('fs');
const {ensureDirSync, writeFileSync} = require('fs-extra');
const OpenAPIParser = require('@readme/openapi-parser');

const fileTemplate = ({method, path, parameters, fileType = 'ts'}) =>
{
    const privateBlock = [];
    const schemaBlock = [];
    const nonAuthorizationHeadersBlock = [];
    if (parameters)
    {
        const headerParams = parameters.filter(el => el.in === 'header');

        // Check if it requires authorization
        const authHeaderIndex = headerParams.findIndex(el => el.name === 'Authorization');
        if (authHeaderIndex > -1)
        {
            privateBlock.push(`    // ${headerParams[authHeaderIndex]?.description}\n`);
            privateBlock.push('    private: true,\n');
        }

        schemaBlock.push('    schema: {\n');
        console.log(headerParams);

        schemaBlock.push('    },\n');
    }

    return [
        '/**\n',
        ' * Generated REST API endpoint handler\n',
        ' * @author: Skitsanos, https://github.com:skitsanos/swagger-to-fatsy\n',
        ' * @version: 1.0.0\n',
        ' *\n',
        ` * ${method.toUpperCase()} ${path}\n`,
        ' */\n\n',
        `const ${method.toLowerCase()}Route = {\n`,
        ...privateBlock,
        ...schemaBlock,
        '    handler: (req, res) => {\n',
        `        res.send('Hello ${path}');\n`,
        '    }\n',
        '};\n\n',
        fileType === 'ts' ?
            `export default ${method.toLowerCase()}Route;\n` :
            `module.exports = ${method.toLowerCase()}Route;\n`
    ].join('');
};

program
.version(version, '-v, --version', 'output the current version')
.requiredOption('-s, --source <source>', 'Swagger source file')
.requiredOption('-d, --destination <destination>', 'Destination folder')
.option('-t, --type <type>', 'Type of file to generate', 'ts')
.option('-vs, --validate-spec', 'Validate against the Swagger 2.0 Specification.', false)
.parse(process.argv);

const {source, destination, type, validateSpec} = program.opts();

process.stdout.write(`\x1B[32mParsing ${resolve(source)}\x1B[0m\n`);

if (!existsSync(source))
{
    process.stdout.write(`\x1B[31m Source file does not exist\x1B[0m\n`);
    process.exit(1);
}

if (!existsSync(destination))
{
    const pathToCreate = resolve(destination);
    process.stdout.write(`\x1B[36m Creating ${pathToCreate}\x1B[0m\n`);
    ensureDirSync(pathToCreate);
}

OpenAPIParser.validate(source, {
    continueOnError: false,
    validate: {
        spec: validateSpec
    }
}, (err, api) =>
{
    if (err)
    {
        process.stdout.write(`\x1B[31m ${err.name}: ${err.message}\x1B[0m\n`);
        process.exit(1);
    }

    process.stdout.write(`\x1B[36m ${api.info.title} \x1B[34m${api.info.version}\x1B[0m\n`);

    OpenAPIParser.parse(source, (errParse, doc) =>
    {
        if (errParse)
        {
            process.stdout.write(`\x1B[31m ${err.message}\x1B[0m\n`);
            process.exit(1);
        }

        const {paths} = doc;

        for (const entry of Object.entries(paths))
        {
            const [endpoint, methods] = entry;

            let endpointPath = endpoint;

            // replace all {param} with $param
            const params = endpoint.match(/{\w+}/g);
            if (params)
            {
                params.forEach(param =>
                {
                    endpointPath = endpointPath.replace(param, `$${param.slice(1, -1)}`);
                });
            }

            const fsPath = pathJoin(resolve(destination), endpointPath);
            ensureDirSync(fsPath);

            for (const method in methods)
            {
                const fileName = `${method}.${type}`;
                process.stdout.write(`\x1B[36m ${method.toUpperCase()} \x1B[34m${endpointPath}\x1B[0m\n`);
                const {parameters} = methods[method];

                //if (!existsSync(pathJoin(fsPath, fileName)))
                writeFileSync(pathJoin(fsPath, fileName), fileTemplate({
                    path: endpointPath,
                    method,
                    parameters,
                    type
                }));
            }
        }

        process.stdout.write(`\x1B[32mParsing complete\x1B[0m`);
    });
});