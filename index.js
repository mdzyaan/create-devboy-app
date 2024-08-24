#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const inquirer = require('inquirer');

async function createDevboyApp(projectName) {
  const projectPath = path.join(process.cwd(), projectName);

  console.log(`Creating a new Devboy app in ${projectPath}`);

  // Create project directory
  await fs.ensureDir(projectPath);

  // Create project structure
  await fs.ensureDir(path.join(projectPath, 'api'));
  await fs.ensureDir(path.join(projectPath, 'models'));

  // Create package.json
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    scripts: {
      start: 'devboy start',
      deploy: 'devboy deploy'
    },
    dependencies: {
      "devboy": "^1.0.0"  // Add devboy as a dependency
    }
  };
  await fs.writeJson(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });

  // Create devboy.config.js
  const devboyConfig = `
module.exports = {
  api: {
    handler: 'index.js',
    routes: []
  }
};
`;
  await fs.writeFile(path.join(projectPath, 'devboy.config.js'), devboyConfig);

  // Create index.js
  const indexJs = `
const routes = require('./devboy.config.js').api.routes;

exports.handler = async (event, context) => {
  const route = routes.find(r => r.path === event.path && r.method === event.httpMethod);
  if (!route) {
    return { statusCode: 404, body: JSON.stringify({ message: 'Not Found' }) };
  }
  const handler = require('./' + route.handler);
  return handler(event, context);
};
`;
  await fs.writeFile(path.join(projectPath, 'index.js'), indexJs);

  console.log('Installing dependencies...');
  execSync('npm install', { cwd: projectPath, stdio: 'inherit' });

  console.log(`
Devboy app created successfully!
  
To get started:
  cd ${projectName}
  npm start
`);
}

if (require.main === module) {
  inquirer
    .prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'What is the name of your project?',
        default: 'my-devboy-app'
      }
    ])
    .then(answers => {
      createDevboyApp(answers.projectName);
    });
}

module.exports = createDevboyApp;