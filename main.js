const express = require('express');
const bodyParser = require('body-parser');
const {execSync, exec, spawn} = require('child_process');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const {v4: uuidv4} = require('uuid');

const app = express();
app.use(bodyParser.json());

const API_KEY = '';


app.post('/execute', checkApiKey, async (req, res) => {
    const {dependencies, files, entryFile, projectName} = req.body;
    if (!projectName || projectName.length < 1) {
        console.log(`[${moment().format('HH:mm:ss')}] Request with missing project name received`)
        return res.status(400).send({error: 'Project name is required'});
    }
    for (const file of files) {
        if (!file.path) {
            console.log(`[${moment().format('HH:mm:ss')}] Request with missing path in one file received`)
            return res.status(400).send({error: 'Property "path" is required for each file'});
        }
        if (!file.content) {
            console.log(`[${moment().format('HH:mm:ss')}] Request with missing content in one file received`)
            return res.status(400).send({error: 'Property "content" is required for each file'});
        }
    }

    let dirName = `${slugifyName(projectName)}__${moment().format('MM-DD_HH-mm')}`;
    if (fs.existsSync(path.join(__dirname, 'apps', dirName))) {
        dirName = `${slugifyName(projectName)}__${moment().format('MM-DD_HH-mm')}_${uuidv4()}`;
    }
    const fullPath = path.join(__dirname, 'apps', dirName);

    console.log(`--------------- [${moment().format('HH:mm:ss')}] Executing code for ${projectName} ---------------`)

    // Create directory
    fs.mkdirSync(fullPath);

    console.log(`Installing dependencies: ${dependencies.join(', ')}`)
    // Initialize npm and install dependencies
    execSync(`cd ${fullPath} && npm init -y && npm install ${dependencies.join(' ')}`);
    fs.writeFileSync(`${fullPath}/request.json`, JSON.stringify(req.body));

    files.forEach(file => {
        const filePath = path.join(fullPath, file.path);
        console.log(`Creating file ${filePath}`)
        fs.writeFileSync(filePath, file.content);
    });

    // Execute entry file
    try {
        console.log(`Executing entry file ${entryFile}...`)
        console.log(`Output:`)
        const proc = spawn(`node`, [`${path.join(fullPath, entryFile)}`])
        proc.stdout.setEncoding('utf8')
        proc.stderr.setEncoding('utf8')

        const output = []
        let finished = false;
        let responed = false;
        proc.stdout.on('data', (data) => {
            output.push(data.toString('utf-8'))
            console.log(data.toString('utf-8'))
        });
        proc.stderr.on('data', (data) => {
            // push as string
            output.push(data.toString('utf-8'))
            console.log(data.toString('utf-8'))
        });
        proc.on('exit', (processExitCode) => {
            console.log(`----- Process exited with code ${processExitCode} -----`)
            finished = true;
            if (!responed) {
                responed = true;
                res.send({
                    processExitCode,
                    output,
                });
            }
        })
        await wait(30 * 1000)
        if (!finished) {
            responed = true;
            console.log(`----- Process auto respond after 60 seconds... ------`)
            res.send({
                processExitCode: null,
                output,
            });
        }
        await wait(3 * 60 * 1000);
        if (!finished) {
            proc.kill();
            console.log(`----- Process killed after 3 minutes ------`)
        }

        console.log(`-------------- End ----------------`)
    } catch (error) {
        console.log(`Error: ${error.message}`)
        res.status(500).send({error: error.message});
    }
});

const port = 3000;
app.listen(port, () => {
    console.log(`App running on port ${port}`);
});

function checkApiKey(req, res, next) {
    const apiKeyHeader = req.get('X-API-Key');
    if (!apiKeyHeader || apiKeyHeader !== API_KEY) {
        console.log(`--------------- [${moment().format('HH:mm:ss')}] Invalid or missing API key ---------------`)
        return res.status(401).send({error: 'Invalid or missing API key'});
    }
    next();
}

function slugifyName(name) {
    return name?.toLowerCase()?.replace(/ /g, '-')?.toLowerCase();
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
