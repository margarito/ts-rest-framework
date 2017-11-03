const path = require('path');
const fs = require('fs');
const package = require(path.join(__dirname, 'package.json'));
const distPackage = {};

const fieldsToCopy = ['name', 'version', 'license', 'description', 'author', 'keywords', 'repository', 'homepage', 'bugs'];

distPackage.main = 'bundles/ts-rest-framework.cjs.js';
distPackage.module = 'index.js';
distPackage.typings = 'index.d.ts';

for (const field of fieldsToCopy) {
    distPackage[field] = package[field];
}

distPackage.dependencies = {
    '@types/body-parser': '^1.16.5',
    '@types/debug': '0.0.30',
    '@types/express': '^4.0.37',
    '@types/jsonwebtoken': '^7.2.3',
    '@types/morgan': '^1.7.32',
    'body-parser': '^1.18.1',
    'debug': '^3.0.1',
    'express': '^4.15.4',
    'http': '0.0.0',
    'jsonwebtoken': '^8.0.1',
    'morgan': '^1.8.2',
    'rxjs': '^5.1.0',
    'ts-db-helper': '^0.0.5'
};

fs.writeFile(path.join(__dirname, 'dist', 'package.json'), JSON.stringify(distPackage, null, 4), (err) => {
    if (err) throw err;
    console.log('>>>> dist package.jon generated.');
});