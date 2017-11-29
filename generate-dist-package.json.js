const path = require('path');
const fs = require('fs');
const package = require(path.join(__dirname, 'package.json'));
const distPackage = {};

const fieldsToCopy = ['name', 'version', 'license', 'description', 'author', 'keywords', 'repository', 'homepage', 'bugs', 'dependencies'];

distPackage.main = 'bundles/ts-rest-framework.cjs.js';
distPackage.module = 'index.js';
distPackage.typings = 'index.d.ts';

for (const field of fieldsToCopy) {
    distPackage[field] = package[field];
}

fs.writeFile(path.join(__dirname, 'dist', 'package.json'), JSON.stringify(distPackage, null, 4), (err) => {
    if (err) throw err;
    console.log('>>>> dist package.jon generated.');
});