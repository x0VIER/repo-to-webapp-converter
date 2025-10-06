import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import Mustache from 'mustache';

/**
 * Generate a React web application based on repository analysis
 * @param {Object} config - Application configuration
 * @returns {string} Path to generated application
 */
export async function generateReactApp(config) {
  try {
    const appName = `${config.name}-webapp`;
    const appPath = path.join(process.cwd(), 'generated', appName);

    // Create React app using standard template
    console.log(chalk.gray(`  Creating React app: ${appName}...`));
    
    // Ensure generated directory exists
    fs.ensureDirSync(path.dirname(appPath));
    
    // Create React app (simulated - in real implementation would use create-react-app)
    execSync(`npx create-react-app ${appPath} --template typescript`, { stdio: 'pipe' });
    
    // Install additional dependencies
    process.chdir(appPath);
    const dependencies = [
      '@tailwindcss/forms',
      'framer-motion',
      'lucide-react',
      'react-router-dom',
      'zustand'
    ];
    
    execSync(`npm install ${dependencies.join(' ')}`, { stdio: 'pipe' });
    
    // Generate application based on repository type
    await generateAppStructure(appPath, config);
    
    return appPath;

  } catch (error) {
    throw new Error(`Failed to generate React app: ${error.message}`);
  }
}

/**
 * Generate application structure based on repository type
 * @param {string} appPath - Path to React application
 * @param {Object} config - Application configuration
 */
async function generateAppStructure(appPath, config) {
  const { features, language, repository } = config;
  
  // Determine application type and generate appropriate structure
  switch (features.type) {
    case 'cli-tool':
      await generateCliToolInterface(appPath, config);
      break;
    case 'library':
      await generateLibraryDocs(appPath, config);
      break;
    case 'data-processor':
      await generateDataInterface(appPath, config);
      break;
    case 'automation':
      await generateAutomationInterface(appPath, config);
      break;
    default:
      await generateGenericInterface(appPath, config);
  }
}

/**
 * Generate CLI tool web interface
 * @param {string} appPath - Application path
 * @param {Object} config - Configuration
 */
async function generateCliToolInterface(appPath, config) {
  const template = await fs.readFile(
    path.join(__dirname, '../../templates/cli-tool.jsx'), 
    'utf8'
  );
  
  const rendered = Mustache.render(template, {
    name: config.name,
    description: config.repository.description,
    features: config.features.list
  });
  
  await fs.writeFile(path.join(appPath, 'src/App.jsx'), rendered);
}

/**
 * Generate library documentation interface
 * @param {string} appPath - Application path
 * @param {Object} config - Configuration
 */
async function generateLibraryDocs(appPath, config) {
  const template = await fs.readFile(
    path.join(__dirname, '../../templates/library-docs.jsx'), 
    'utf8'
  );
  
  const rendered = Mustache.render(template, {
    name: config.name,
    description: config.repository.description,
    language: config.language.primary,
    examples: generateCodeExamples(config)
  });
  
  await fs.writeFile(path.join(appPath, 'src/App.jsx'), rendered);
}

/**
 * Generate data processing interface
 * @param {string} appPath - Application path
 * @param {Object} config - Configuration
 */
async function generateDataInterface(appPath, config) {
  const template = await fs.readFile(
    path.join(__dirname, '../../templates/data-processor.jsx'), 
    'utf8'
  );
  
  const rendered = Mustache.render(template, {
    name: config.name,
    description: config.repository.description,
    inputTypes: ['CSV', 'JSON', 'XML'],
    outputTypes: ['CSV', 'JSON', 'PDF']
  });
  
  await fs.writeFile(path.join(appPath, 'src/App.jsx'), rendered);
}

/**
 * Generate automation/workflow interface
 * @param {string} appPath - Application path
 * @param {Object} config - Configuration
 */
async function generateAutomationInterface(appPath, config) {
  const template = await fs.readFile(
    path.join(__dirname, '../../templates/automation.jsx'), 
    'utf8'
  );
  
  const rendered = Mustache.render(template, {
    name: config.name,
    description: config.repository.description,
    workflows: config.features.list.map(feature => ({
      name: feature,
      description: `${feature} automation workflow`
    }))
  });
  
  await fs.writeFile(path.join(appPath, 'src/App.jsx'), rendered);
}

/**
 * Generate generic interface for unknown repository types
 * @param {string} appPath - Application path
 * @param {Object} config - Configuration
 */
async function generateGenericInterface(appPath, config) {
  const template = await fs.readFile(
    path.join(__dirname, '../../templates/generic.jsx'), 
    'utf8'
  );
  
  const rendered = Mustache.render(template, {
    name: config.name,
    description: config.repository.description,
    language: config.language.primary,
    features: config.features.list,
    repositoryUrl: `https://github.com/${config.repository.owner}/${config.name}`
  });
  
  await fs.writeFile(path.join(appPath, 'src/App.jsx'), rendered);
}

/**
 * Generate code examples based on repository language
 * @param {Object} config - Configuration
 * @returns {Array} Code examples
 */
function generateCodeExamples(config) {
  const examples = [];
  
  switch (config.language.primary) {
    case 'javascript':
      examples.push({
        title: 'Installation',
        code: `npm install ${config.name}`,
        language: 'bash'
      });
      examples.push({
        title: 'Usage',
        code: `import ${config.name} from '${config.name}';\\n\\nconst result = ${config.name}();`,
        language: 'javascript'
      });
      break;
    case 'rust':
      examples.push({
        title: 'Installation',
        code: `cargo install ${config.name}`,
        language: 'bash'
      });
      examples.push({
        title: 'Usage',
        code: `use ${config.name}::*;\\n\\nfn main() {\\n    // Your code here\\n}`,
        language: 'rust'
      });
      break;
    case 'python':
      examples.push({
        title: 'Installation',
        code: `pip install ${config.name}`,
        language: 'bash'
      });
      examples.push({
        title: 'Usage',
        code: `import ${config.name}\\n\\nresult = ${config.name}.process()`,
        language: 'python'
      });
      break;
  }
  
  return examples;
}
