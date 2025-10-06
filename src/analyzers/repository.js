import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

/**
 * Analyze a GitHub repository and extract metadata
 * @param {string} repository - Repository name (owner/repo or repo)
 * @returns {Object} Repository information
 */
export async function analyzeRepository(repository) {
  try {
    // Determine if it's a full path or just repo name
    const isFullPath = repository.includes('/');
    const repoName = isFullPath ? repository.split('/')[1] : repository;
    const repoPath = path.join(process.cwd(), 'temp', repoName);

    // Clone repository if it doesn't exist
    if (!fs.existsSync(repoPath)) {
      console.log(chalk.gray(`  Cloning ${repository}...`));
      fs.ensureDirSync(path.dirname(repoPath));
      
      const cloneCommand = isFullPath 
        ? `gh repo clone ${repository} ${repoPath}`
        : `gh repo clone ${repository} ${repoPath}`;
      
      execSync(cloneCommand, { stdio: 'pipe' });
    }

    // Read repository metadata
    const packageJsonPath = path.join(repoPath, 'package.json');
    const readmePath = path.join(repoPath, 'README.md');
    const cargoTomlPath = path.join(repoPath, 'Cargo.toml');
    
    let metadata = {
      name: repoName,
      path: repoPath,
      description: '',
      language: 'unknown',
      dependencies: [],
      scripts: [],
      hasReadme: fs.existsSync(readmePath)
    };

    // Extract from package.json (Node.js projects)
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = fs.readJsonSync(packageJsonPath);
      metadata.description = packageJson.description || '';
      metadata.language = 'javascript';
      metadata.dependencies = Object.keys(packageJson.dependencies || {});
      metadata.scripts = Object.keys(packageJson.scripts || {});
    }

    // Extract from Cargo.toml (Rust projects)
    if (fs.existsSync(cargoTomlPath)) {
      const cargoContent = fs.readFileSync(cargoTomlPath, 'utf8');
      const nameMatch = cargoContent.match(/name\\s*=\\s*"([^"]+)"/);
      const descMatch = cargoContent.match(/description\\s*=\\s*"([^"]+)"/);
      
      if (nameMatch) metadata.name = nameMatch[1];
      if (descMatch) metadata.description = descMatch[1];
      metadata.language = 'rust';
    }

    // Extract from README.md
    if (metadata.hasReadme) {
      const readmeContent = fs.readFileSync(readmePath, 'utf8');
      if (!metadata.description) {
        // Extract first paragraph as description
        const lines = readmeContent.split('\\n').filter(line => line.trim());
        const firstParagraph = lines.find(line => !line.startsWith('#') && line.length > 20);
        if (firstParagraph) {
          metadata.description = firstParagraph.substring(0, 200);
        }
      }
    }

    return metadata;

  } catch (error) {
    throw new Error(`Failed to analyze repository: ${error.message}`);
  }
}

/**
 * Get repository statistics
 * @param {string} repoPath - Path to repository
 * @returns {Object} Repository statistics
 */
export function getRepositoryStats(repoPath) {
  try {
    const stats = {
      files: 0,
      lines: 0,
      size: 0,
      languages: {}
    };

    // Count files and calculate size
    const walkDir = (dir) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          walkDir(filePath);
        } else if (stat.isFile()) {
          stats.files++;
          stats.size += stat.size;
          
          const ext = path.extname(file).toLowerCase();
          if (ext) {
            stats.languages[ext] = (stats.languages[ext] || 0) + 1;
          }
        }
      }
    };

    walkDir(repoPath);
    return stats;

  } catch (error) {
    console.warn(chalk.yellow(`Warning: Could not get repository stats: ${error.message}`));
    return { files: 0, lines: 0, size: 0, languages: {} };
  }
}
