#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const inquirer = require('inquirer');

function resolveDevboyCliPath() {
  const candidates = [
    path.join(process.cwd(), 'devboy-cli'),
    path.join(process.cwd(), '..', 'devboy-cli'),
    path.resolve(__dirname, '..', 'devboy-cli'),
  ];
  for (const cliPath of candidates) {
    if (fs.existsSync(path.join(cliPath, 'package.json'))) {
      return cliPath;
    }
  }
  return null;
}

function toFileDep(projectPath, targetPath) {
  let rel = path.relative(projectPath, targetPath);
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return `file:${rel}`;
}

function resolveDevboyCliDependency(projectPath) {
  const cliPath = resolveDevboyCliPath();
  if (cliPath) return toFileDep(projectPath, cliPath);
  return '^2.0.0';
}

function resolveDevboySdkDependency(projectPath) {
  const cliPath = resolveDevboyCliPath();
  if (cliPath) return toFileDep(projectPath, path.join(cliPath, 'sdk'));
  return 'devboy-cli/sdk';
}

async function createDevboyApp(projectName, options = {}) {
  const name = projectName || options.projectName;
  if (!name) {
    throw new Error('Project name is required');
  }

  const projectPath = path.join(process.cwd(), name);
  console.log(`Creating a new Devboy app in ${projectPath}`);

  if (fs.existsSync(projectPath) && fs.readdirSync(projectPath).length) {
    throw new Error(`Directory ${name} already exists and is not empty`);
  }

  await fs.ensureDir(projectPath);
  await fs.ensureDir(path.join(projectPath, 'api'));
  await fs.ensureDir(path.join(projectPath, 'models'));
  await fs.ensureDir(path.join(projectPath, 'lib'));

  const answers =
    options.answers ||
    (await inquirer.prompt([
      {
        type: 'list',
        name: 'compute',
        message: 'Compute provider (API hosting):',
        choices: [
          { name: 'AWS (available)', value: 'aws' },
          { name: 'Azure (coming soon)', value: 'azure', disabled: true },
          { name: 'GCP (coming soon)', value: 'gcp', disabled: true },
          { name: 'OCI (coming soon)', value: 'oci', disabled: true },
        ],
        default: 'aws',
      },
      {
        type: 'input',
        name: 'region',
        message: 'AWS region:',
        default: 'us-east-1',
        when: (a) => a.compute === 'aws',
      },
      {
        type: 'list',
        name: 'auth',
        message: 'Auth integration:',
        choices: [
          { name: 'Clerk', value: 'clerk' },
          { name: 'None', value: 'none' },
        ],
        default: 'clerk',
      },
      {
        type: 'list',
        name: 'db',
        message: 'Database integration:',
        choices: [
          { name: 'Neon (Postgres)', value: 'neon' },
          { name: 'MongoDB Atlas', value: 'mongodb-atlas' },
          { name: 'None', value: 'none' },
        ],
        default: 'neon',
      },
      {
        type: 'list',
        name: 'cron',
        message: 'Cron integration:',
        choices: [
          { name: 'None', value: 'none' },
          { name: 'Upstash QStash', value: 'qstash' },
        ],
        default: 'none',
      },
    ]));

  const packageJson = {
    name,
    version: '1.0.0',
    private: true,
    scripts: {
      start: 'devboy start',
      studio: 'devboy studio',
      deploy: 'devboy deploy',
      doctor: 'devboy doctor',
    },
    dependencies: {
      'devboy-cli': resolveDevboyCliDependency(projectPath),
      devboy: resolveDevboySdkDependency(projectPath),
    },
  };

  await fs.writeJson(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });

  const config = {
    compute: {
      provider: answers.compute || 'aws',
      region: answers.region || 'us-east-1',
    },
    auth: { provider: answers.auth || 'none' },
    db: { provider: answers.db || 'none' },
    cron: { provider: answers.cron || 'none' },
    api: {
      handler: 'index.js',
      routes: [
        {
          path: '/health',
          method: 'GET',
          handler: 'api/health/get/index.js',
        },
      ],
    },
    jobs: [],
  };

  await fs.writeFile(
    path.join(projectPath, 'devboy.config.js'),
    `module.exports = ${JSON.stringify(config, null, 2)};\n`
  );

  await fs.writeFile(
    path.join(projectPath, 'index.js'),
    `'use strict';

const { invokeRoute } = require('devboy-cli/lib/runtime/router');
const { normalizeConfig } = require('devboy-cli/lib/config');
const rawConfig = require('./devboy.config.js');

function normalizeEvent(event) {
  if (event.httpMethod && event.path) return event;
  const method = event.requestContext && event.requestContext.http && event.requestContext.http.method;
  const p = event.rawPath || (event.requestContext && event.requestContext.http && event.requestContext.http.path);
  return {
    ...event,
    httpMethod: method || event.httpMethod,
    path: p || event.path,
  };
}

exports.handler = async (event, context) => {
  return invokeRoute(normalizeConfig(rawConfig), __dirname, normalizeEvent(event), context);
};
`
  );

  await fs.ensureDir(path.join(projectPath, 'api', 'health', 'get'));
  await fs.writeFile(
    path.join(projectPath, 'api', 'health', 'get', 'index.js'),
    `const { db, auth } = require('devboy');

module.exports = async (params, context) => {
  // const user = await auth.requireAuth(context);
  // if (user.error) return user.error;
  // const items = await db.table('items').find();
  return { ok: true, service: 'devboy', method: context.method };
};
`
  );

  await fs.writeFile(
    path.join(projectPath, '.env.local.example'),
    `# Copy to .env.local and fill in
# CLERK_SECRET_KEY=
# CLERK_PUBLISHABLE_KEY=
# DATABASE_URL=
# MONGODB_URI=
# QSTASH_TOKEN=
# QSTASH_CURRENT_SIGNING_KEY=
# QSTASH_NEXT_SIGNING_KEY=
`
  );

  await fs.writeFile(
    path.join(projectPath, '.gitignore'),
    `node_modules
.env
.env.local
.devboy/
devboy-state.json
.DS_Store
`
  );

  await fs.writeFile(
    path.join(projectPath, 'README.md'),
    `# ${name}

Devboy backend API.

## Commands

- \`npm start\` — local API (\`http://localhost:3000\`)
- \`npm run studio\` — local config dashboard (not deployed)
- \`npm run doctor\` — check AWS + integration credentials
- \`npm run deploy\` — deploy API to AWS (consumable public URL)

## Integrations selected

- Compute: ${answers.compute}
- Auth: ${answers.auth}
- DB: ${answers.db}
- Cron: ${answers.cron}

After install, run \`npx devboy apply\` to scaffold helpers for the selected integrations, then paste secrets into \`.env.local\`.
`
  );

  if (!options.skipInstall) {
    console.log('Installing dependencies...');
    execSync('npm install', { cwd: projectPath, stdio: 'inherit' });

    try {
      execSync(
        `npx devboy apply --auth ${answers.auth} --db ${answers.db} --cron ${answers.cron} --compute ${answers.compute} --region ${answers.region || 'us-east-1'}`,
        { cwd: projectPath, stdio: 'inherit' }
      );
    } catch {
      console.log('Note: run `npx devboy apply` after linking a published devboy-cli.');
    }
  }

  console.log(`
Devboy app created successfully!

Next:
  cd ${name}
  cp .env.local.example .env.local   # add Clerk / Neon / Atlas / QStash keys
  npm run studio                     # local config UI
  npm start                          # local API
  npm run deploy                     # ship API to AWS
`);
}

function parseArgs(argv) {
  const args = argv.slice(2).filter((a) => !a.startsWith('-'));
  return { projectName: args[0] };
}

if (require.main === module) {
  (async () => {
    const { projectName: argName } = parseArgs(process.argv);
    let projectName = argName;
    if (!projectName) {
      const answered = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'What is the name of your project?',
          default: 'my-devboy-app',
        },
      ]);
      projectName = answered.projectName;
    }
    try {
      await createDevboyApp(projectName);
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  })();
}

module.exports = createDevboyApp;
