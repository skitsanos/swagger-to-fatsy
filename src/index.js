#!/usr/bin/env node
const {program} = require('commander');
const {version} = require('../package.json');
const {resolve, join: pathJoin} = require('path');
const {existsSync} = require('fs');
const {ensureDirSync, writeFileSync} = require('fs-extra');
const OpenAPIParser = require('@readme/openapi-parser');

const fileTemplate = ({method, path, parameters, requestBody, fileType = 'ts', components}) =>
{
    const privateBlock = [];
    const schemaBlock = [];
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

        // collecting Header params
        const nonAuthorzationHeaderParams = headerParams.filter(el => el.name !== 'Authorization');
        const headersSchemaBlock = [];
        if (nonAuthorzationHeaderParams.length > 0)
        {
            headersSchemaBlock.push('        headers: {\n');
            headersSchemaBlock.push('          type: \'object\',\n');
            headersSchemaBlock.push('          properties: {\n');

            for (const headerParam of nonAuthorzationHeaderParams)
            {
                headersSchemaBlock.push(`            \'${headerParam.name}\': {\n`);
                headersSchemaBlock.push(`              type: '${headerParam.schema.type}',\n`);
                headersSchemaBlock.push(`              description: ${JSON.stringify(headerParam.description)},\n`);
                headersSchemaBlock.push('            },\n');
            }

            headersSchemaBlock.push('          },\n');
            const requiredFields = nonAuthorzationHeaderParams.filter(el => el.required).map(el => JSON.stringify(el.name));

            if (requiredFields.length > 0)
            {
                headersSchemaBlock.push(`          required: [${requiredFields.join(',')}]\n`);
            }
            headersSchemaBlock.push('        },\n');
        }

        schemaBlock.push('    schema: {\n');
        schemaBlock.push(...headersSchemaBlock);

        // check the body
        const schemaBody = [];
        if (requestBody && requestBody.required)
        {
            const schema = Object.values(requestBody.content)[0].schema;
            if (Object.keys(schema).includes('$ref'))
            {
                const refToSchema = schema.$ref.split('/').pop();
                // get schema from components
                const schemaObject = components.schemas[refToSchema];
                if (typeof schemaObject === 'object')
                {
                    schemaBody.push(`            body: ${JSON.stringify(schemaObject, 4)},\n`);
                }
            }
            else
            {
                schemaBody.push(`            body: ${JSON.stringify(schema, 4)},\n`);
            }
        }

        schemaBlock.push(...schemaBody);
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
        `        res.send({"result": {}});\n`,
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
            process.stdout.write(`\x1B[31m ${errParse.message}\x1B[0m\n`);
            process.exit(1);
        }

        const {paths, components} = doc;

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
                const {parameters, requestBody} = methods[method];

                if (!existsSync(pathJoin(fsPath, fileName)))
                {
                    writeFileSync(pathJoin(fsPath, fileName), fileTemplate({
                        path: endpointPath,
                        method,
                        parameters,
                        requestBody,
                        type,
                        components
                    }));
                }
            }
        }

        process.stdout.write(`\x1B[32mParsing complete\x1B[0m`);
    });
});