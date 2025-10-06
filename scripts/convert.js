#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

// Import analyzers
import { analyzeRepository } from '../src/analyzers/repository.js';
import { detectLanguage } from '../src/analyzers/language.js';
import { extractFeatures } from '../src/analyzers/features.js';

// Import generators
import { generateReactApp } from '../src/generators/react.js';
import { generateComponents } from '../src/generators/components.js';

// Import deployers
import { deployToVercel } from '../src/deployers/vercel.js';

program
  .name('convert')
  .description('Convert GitHub repository to React web application')
  .argument('<repository>', 'Repository name (owner/repo or just repo for your repos)')
  .option('-t, --template <template>', 'UI template to use', 'futuristic')
  .option('-d, --deploy', 'Deploy after conversion')
  .option('-p, --platform <platform>', 'Deployment platform', 'vercel')
  .action(async (repository, options) => {
    console.log(chalk.blue.bold('🚀 Repository to Web App Converter'));
    console.log(chalk.gray('Transforming repositories into beautiful web applications\\n'));

    try {
      // Step 1: Repository Analysis
      const analysisSpinner = ora('Analyzing repository...').start();
      
      const repoInfo = await analyzeRepository(repository);
      const language = await detectLanguage(repoInfo.path);
      const features = await extractFeatures(repoInfo.path, language);
      
      analysisSpinner.succeed(chalk.green('Repository analyzed successfully'));
      
      console.log(chalk.cyan('📊 Analysis Results:'));
      console.log(chalk.white(`  Repository: ${repoInfo.name}`));
      console.log(chalk.white(`  Language: ${language.primary}`));
      console.log(chalk.white(`  Type: ${features.type}`));
      console.log(chalk.white(`  Features: ${features.list.join(', ')}\\n`));

      // Step 2: Web App Generation
      const generationSpinner = ora('Generating React web application...').start();
      
      const appConfig = {
        name: repoInfo.name,
        template: options.template,
        language: language,
        features: features,
        repository: repoInfo
      };
      
      const appPath = await generateReactApp(appConfig);
      await generateComponents(appPath, appConfig);
      
      generationSpinner.succeed(chalk.green('React application generated'));
      
      console.log(chalk.cyan('🎨 Generated Application:'));
      console.log(chalk.white(`  Path: ${appPath}`));
      console.log(chalk.white(`  Template: ${options.template}`));
      console.log(chalk.white(`  Components: ${features.list.length} generated\\n`));

      // Step 3: Build Application
      const buildSpinner = ora('Building application for production...').start();
      
      process.chdir(appPath);
      execSync('pnpm install', { stdio: 'pipe' });
      execSync('pnpm run build', { stdio: 'pipe' });
      
      buildSpinner.succeed(chalk.green('Application built successfully'));

      // Step 4: Deployment (if requested)
      if (options.deploy) {
        const deploySpinner = ora(`Deploying to ${options.platform}...`).start();
        
        let deploymentUrl;
        switch (options.platform) {
          case 'vercel':
            deploymentUrl = await deployToVercel(appPath);
            break;
          default:
            throw new Error(`Unsupported platform: ${options.platform}`);
        }
        
        deploySpinner.succeed(chalk.green('Application deployed successfully'));
        console.log(chalk.cyan('🌐 Deployment URL:'));
        console.log(chalk.white.underline(`  ${deploymentUrl}\\n`));
      }

      // Success Summary
      console.log(chalk.green.bold('✅ Conversion completed successfully!'));
      console.log(chalk.gray('Your repository has been transformed into a modern web application.\\n'));
      
      if (!options.deploy) {
        console.log(chalk.yellow('💡 Next steps:'));
        console.log(chalk.white(`  cd ${appPath}`));
        console.log(chalk.white('  pnpm run dev    # Start development server'));
        console.log(chalk.white('  pnpm run deploy # Deploy to hosting platform'));
      }

    } catch (error) {
      console.error(chalk.red.bold('❌ Conversion failed:'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

program.parse();
