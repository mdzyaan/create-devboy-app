# create-devboy-app

`create-devboy-app` is a tool for quickly setting up new Devboy projects. It provides a streamlined way to create the initial structure and configuration for building serverless APIs with Devboy.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Next Steps](#next-steps)
- [Contributing](#contributing)
- [License](#license)

## Installation

You don't need to install `create-devboy-app` globally. You can use it directly with npx:

```bash
npx create-devboy-app my-project
```

## Usage

To create a new Devboy project, run:

```bash
npx create-devboy-app my-project
```

Replace `my-project` with your desired project name.

Follow the prompts to complete the project setup. Once finished, you can start your new project:

```bash
cd my-project
npm start
```

## Project Structure

`create-devboy-app` will generate a project with the following structure:

```
my-project/
├── api/
├── models/
├── index.js
├── devboy.config.js
└── package.json
```

- `api/`: Directory for your API route handlers
- `models/`: Directory for your data models
- `index.js`: Main entry point for your application
- `devboy.config.js`: Configuration file for your Devboy project
- `package.json`: Node.js project manifest

## Configuration

The generated `devboy.config.js` file will look something like this:

```javascript
module.exports = {
  api: {
    handler: 'index.js',
    routes: []
  }
};
```

You can modify this file to add routes and customize your API configuration.

## Next Steps

After creating your project:

1. Add new routes using the Devboy CLI:
   ```
   npx devboy-cli new:route
   ```

2. Implement your API logic in the generated route files.

3. Start the development server:
   ```
   npm start
   ```

4. Begin building your serverless API!

## Contributing

We welcome contributions to `create-devboy-app`! Please see our [Contributing Guide](CONTRIBUTING.md) for more details.

## License

`create-devboy-app` is [MIT licensed](LICENSE).