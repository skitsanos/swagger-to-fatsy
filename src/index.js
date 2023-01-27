const {program} = require('commander');
const {version} = require('../package.json');
const {resolve, join: pathJoin} = require('path');
const {existsSync, readFileSync} = require('fs');
const {ensureDirSync, writeFileSync} = require('fs-extra');
const {parse: parseYaml} = require('yaml');

const fileTemplate = (method, path, type = 'ts') => {

    return [
        '/**\n',
        ' * Generated REST API endpoint handler\n',
        ` * ${method.toUpperCase()} ${path}\n`,
        ' */\n\n',
        `const ${method.toLowerCase()}Route = {\n`,
        '    handler: (req, res) => {\n',
        `        res.send('Hello ${path}');\n`,
        '    }\n',
        '};\n\n',
        type === 'ts' ?
            `export default ${method.toLowerCase()}Route;\n` :
            `module.exports = ${method.toLowerCase()}Route;\n`
    ].join('');
};

program
    .version(version, '-v, --version', 'output the current version')
    .requiredOption('-s, --source <source>', 'Swagger source file')
    .requiredOption('-d, --destination <destination>', 'Destination folder')
    .option('-t, --type <type>', 'Type of file to generate', 'ts')
    .parse(process.argv);

const {source, destination, type} = program.opts();

process.stdout.write(`\x1B[32mParsing ${resolve(source)}\x1B[0m\n`);

if (!existsSync(source)) {
    process.stdout.write(`\x1B[31m Source file does not exist\x1B[0m\n`);
    process.exit(1);
}

if (!existsSync(destination)) {
    const pathToCreate = resolve(destination);
    process.stdout.write(`\x1B[36m Creating ${pathToCreate}\x1B[0m\n`);
    ensureDirSync(pathToCreate);
}

const yamlContent = readFileSync(source, 'utf8');
const doc = parseYaml(yamlContent);

const {paths} = doc;

for (const entry of Object.entries(paths)) {
    const [endpoint, methods] = entry;

    let endpointPath = endpoint;

    // replace all {param} with $param
    const params = endpoint.match(/{\w+}/g);
    if (params) {
        params.forEach(param => {
            endpointPath = endpointPath.replace(param, `$${param.slice(1, -1)}`);
        });
    }

    const fsPath = pathJoin(resolve(destination), endpointPath);
    ensureDirSync(fsPath);

    const methodsFound = Object.keys(methods);
    for (const method of methodsFound) {
        const fileName = `${method}.${type}`;
        process.stdout.write(`\x1B[36m ${method.toUpperCase()} \x1B[34m${endpointPath}\x1B[0m\n`);

        if (!existsSync(pathJoin(fsPath, fileName))) {
            writeFileSync(pathJoin(fsPath, fileName), fileTemplate(method, endpointPath, type));
        }
    }
}

process.stdout.write(`\x1B[32mParsing complete\x1B[0m`);