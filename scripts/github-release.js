#!/usr/bin/env node

/**
 * GitHub Release Script
 * Creates GitHub releases with assets for easy distribution
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

class GitHubReleaseManager {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.distDir = path.join(this.rootDir, 'dist');
    this.version = this.getVersion();
  }

  log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
  }

  success(message) {
    this.log(`✓ ${message}`, colors.green);
  }

  error(message) {
    this.log(`✗ ${message}`, colors.red);
  }

  warning(message) {
    this.log(`⚠ ${message}`, colors.yellow);
  }

  info(message) {
    this.log(`ℹ ${message}`, colors.blue);
  }

  getVersion() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(this.rootDir, 'package.json'), 'utf8'));
      return packageJson.version || '1.0.0';
    } catch (error) {
      return '1.0.0';
    }
  }

  checkGitHubCLI() {
    try {
      execSync('gh --version', { stdio: 'pipe' });
      return true;
    } catch (error) {
      this.error('GitHub CLI (gh) not found');
      this.info('Please install GitHub CLI: https://cli.github.com/');
      return false;
    }
  }

  checkAuthentication() {
    try {
      const result = execSync('gh auth status', { stdio: 'pipe', encoding: 'utf8' });
      this.success('GitHub authentication verified');
      return true;
    } catch (error) {
      this.error('GitHub authentication required');
      this.info('Run: gh auth login');
      return false;
    }
  }

  getCurrentBranch() {
    try {
      return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch (error) {
      return 'main';
    }
  }

  getCommitHash() {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
      return 'unknown';
    }
  }

  createReleaseNotes() {
    const releaseNotes = `# PortableLLM v${this.version}

🎉 **Healthcare-Focused Portable AI Solution**

PortableLLM is a comprehensive, privacy-first AI solution designed specifically for healthcare professionals and small businesses. This release provides everything needed to deploy and run large language models locally with zero cloud dependencies.

## ✨ Key Features

### 🏥 Healthcare-Optimized
- **HIPAA Compliant** - Built for healthcare data protection
- **Medical Workflows** - Dental practice and clinical documentation demos
- **Patient Communication** - AI-powered analysis and response generation
- **Privacy-First** - 100% local processing, no cloud dependencies

### 🚀 Easy Installation
- **Cross-Platform Support** - Windows, macOS, Linux
- **One-Click Installers** - Non-technical user friendly
- **Docker Integration** - Containerized deployment
- **Automated Setup** - Handles all dependencies

### 🔒 Enterprise Security
- **AES-256 Encryption** - Enterprise-grade data protection
- **Comprehensive Audit Logging** - Complete compliance trail
- **Air-Gap Capable** - Works completely offline
- **Zero Data Transmission** - No external API calls

### 🤖 AI Model Management
- **Healthcare Models** - Pre-configured for medical use cases
- **Automatic Downloads** - Easy model acquisition
- **Performance Monitoring** - Real-time usage metrics
- **Resource Optimization** - Efficient deployment

## 📦 Download Options

| Platform | File | Description |
|----------|------|-------------|
| **Windows** | \`PortableLLM-v${this.version}.zip\` | Windows installer package |
| **Linux/macOS** | \`PortableLLM-v${this.version}.tar.gz\` | Unix installer package |
| **Checksums** | \`SHA256SUMS\` | File integrity verification |

## 🚀 Quick Install

### Windows
1. Download \`PortableLLM-v${this.version}.zip\`
2. Extract the archive
3. Run: \`PowerShell -ExecutionPolicy Bypass -File install.ps1\`

### Linux/macOS
1. Download \`PortableLLM-v${this.version}.tar.gz\`
2. Extract: \`tar -xzf PortableLLM-v${this.version}.tar.gz\`
3. Run: \`./install.sh\`

## 🎯 What's Included

- ✅ **Complete PortableLLM Application** - Full-featured AI platform
- ✅ **Healthcare Demos** - Dental practice, medical documentation, privacy compliance
- ✅ **Cross-Platform Installers** - Windows, macOS, Linux support
- ✅ **Comprehensive Documentation** - Setup guides and API reference
- ✅ **Model Management Tools** - Download and manage AI models
- ✅ **Privacy Compliance Tools** - PHI detection and de-identification

## 🏥 Healthcare Use Cases

### Dental Practices
- **Patient Communication Analysis** - Analyze patient anxiety and concerns
- **Treatment Plan Explanations** - Generate patient-friendly descriptions
- **Insurance Documentation** - Pre-authorization letter generation
- **Practice Analytics** - Feedback analysis and improvement recommendations

### Medical Documentation
- **Clinical Note Enhancement** - Transform brief notes to comprehensive SOAP format
- **Differential Diagnosis Support** - AI-assisted diagnostic reasoning
- **Patient Education Materials** - Personalized educational content
- **Quality Metrics Documentation** - Ensure compliance with quality indicators

### Privacy & Compliance
- **PHI Detection** - Automatically identify protected health information
- **Data De-identification** - Multiple de-identification methods
- **Audit Trail** - Comprehensive logging for HIPAA compliance
- **Compliance Verification** - Built-in compliance checking tools

## 🔧 System Requirements

### Minimum Requirements
- **RAM:** 8GB (16GB+ recommended)
- **Storage:** 20GB available space
- **CPU:** Multi-core processor (Intel/AMD/Apple Silicon)
- **OS:** Windows 10+, macOS 10.14+, Ubuntu 18.04+

### Recommended Setup
- **RAM:** 32GB for large models
- **GPU:** NVIDIA GPU for better performance (optional)
- **SSD:** Fast storage for better model loading
- **Network:** Internet for initial model downloads

## 🆘 Support & Documentation

- **📚 Documentation:** Complete guides included in package
- **🧪 Interactive Demos:** Hands-on learning examples
- **🔧 API Reference:** Full programmatic access documentation
- **🚨 Issue Tracking:** [GitHub Issues](https://github.com/[username]/PortableLLM/issues)

## 🤝 Contributing

PortableLLM is open source and welcomes contributions:
- **Bug Reports:** Help us improve reliability
- **Feature Requests:** Shape the roadmap
- **Code Contributions:** Enhance functionality
- **Documentation:** Help others get started

## 📄 License

MIT License - See LICENSE file for details.

---

**Built for Healthcare Professionals** | **Privacy-First Architecture** | **Enterprise-Ready Security**

Transform your practice with AI that respects privacy and ensures compliance.`;

    return releaseNotes;
  }

  checkDistFiles() {
    if (!fs.existsSync(this.distDir)) {
      this.error('Distribution directory not found');
      this.info('Run: node scripts/package-release.js');
      return false;
    }

    const expectedFiles = [
      `PortableLLM-v${this.version}.zip`,
      `PortableLLM-v${this.version}.tar.gz`,
      'SHA256SUMS'
    ];

    const missingFiles = expectedFiles.filter(file => 
      !fs.existsSync(path.join(this.distDir, file))
    );

    if (missingFiles.length > 0) {
      this.error('Missing distribution files:');
      missingFiles.forEach(file => console.log(`  • ${file}`));
      this.info('Run: node scripts/package-release.js');
      return false;
    }

    return true;
  }

  async createGitHubRelease(options = {}) {
    const { draft = false, prerelease = false } = options;
    
    this.log('🚀 GitHub Release Creation', colors.cyan);
    this.log('='.repeat(50), colors.cyan);

    // Pre-flight checks
    this.info('Running pre-flight checks...');
    
    if (!this.checkGitHubCLI()) return false;
    if (!this.checkAuthentication()) return false;
    if (!this.checkDistFiles()) return false;

    // Git information
    const branch = this.getCurrentBranch();
    const commit = this.getCommitHash();
    
    this.success(`Git branch: ${branch}`);
    this.success(`Commit hash: ${commit.substring(0, 8)}`);

    // Create tag if it doesn't exist
    const tagName = `v${this.version}`;
    
    try {
      execSync(`git tag -l ${tagName}`, { stdio: 'pipe' });
      this.info(`Tag ${tagName} already exists`);
    } catch (error) {
      this.info(`Creating tag: ${tagName}`);
      try {
        execSync(`git tag ${tagName}`, { stdio: 'pipe' });
        execSync(`git push origin ${tagName}`, { stdio: 'pipe' });
        this.success(`Created and pushed tag: ${tagName}`);
      } catch (tagError) {
        this.error(`Failed to create tag: ${tagError.message}`);
        return false;
      }
    }

    // Generate release notes
    this.info('Generating release notes...');
    const releaseNotes = this.createReleaseNotes();
    const notesFile = path.join(this.distDir, 'release-notes.md');
    fs.writeFileSync(notesFile, releaseNotes);

    // Create GitHub release
    this.info('Creating GitHub release...');
    
    try {
      const draftFlag = draft ? '--draft' : '';
      const prereleaseFlag = prerelease ? '--prerelease' : '';
      
      const command = `gh release create ${tagName} ${draftFlag} ${prereleaseFlag} --title "PortableLLM v${this.version}" --notes-file "${notesFile}"`;
      
      execSync(command, { stdio: 'inherit' });
      this.success(`Created GitHub release: ${tagName}`);
    } catch (error) {
      this.error(`Failed to create GitHub release: ${error.message}`);
      return false;
    }

    // Upload assets
    this.info('Uploading release assets...');
    
    const assetsToUpload = [
      `PortableLLM-v${this.version}.zip`,
      `PortableLLM-v${this.version}.tar.gz`,
      'SHA256SUMS'
    ];

    for (const asset of assetsToUpload) {
      const assetPath = path.join(this.distDir, asset);
      
      if (fs.existsSync(assetPath)) {
        try {
          this.info(`Uploading ${asset}...`);
          execSync(`gh release upload ${tagName} "${assetPath}"`, { stdio: 'inherit' });
          this.success(`Uploaded: ${asset}`);
        } catch (error) {
          this.error(`Failed to upload ${asset}: ${error.message}`);
        }
      } else {
        this.warning(`Asset not found: ${asset}`);
      }
    }

    // Generate download URLs
    this.log('\n📊 Release Summary', colors.cyan);
    this.log('='.repeat(50), colors.cyan);
    
    try {
      const releaseInfo = execSync(`gh release view ${tagName} --json url,assets`, { encoding: 'utf8' });
      const release = JSON.parse(releaseInfo);
      
      this.success(`Release URL: ${release.url}`);
      
      if (release.assets && release.assets.length > 0) {
        this.log('\n📥 Download URLs:', colors.yellow);
        release.assets.forEach(asset => {
          console.log(`  • ${asset.name}: ${asset.url}`);
        });
      }
    } catch (error) {
      this.warning('Could not retrieve release information');
    }

    // Create download badge URLs for README
    this.log('\n🏷️ Badges for README:', colors.cyan);
    console.log(`[![Release](https://img.shields.io/github/v/release/[username]/PortableLLM)](https://github.com/[username]/PortableLLM/releases/latest)`);
    console.log(`[![Downloads](https://img.shields.io/github/downloads/[username]/PortableLLM/total)](https://github.com/[username]/PortableLLM/releases)`);

    // Next steps
    this.log('\n🚀 Next Steps:', colors.cyan);
    console.log('  1. Update README.md with release badges and download links');
    console.log('  2. Announce release on social media and forums');
    console.log('  3. Update documentation with new version info');
    console.log('  4. Monitor for issues and feedback');

    this.success('\n✅ GitHub release created successfully!');
    return true;
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    draft: false,
    prerelease: false
  };

  // Parse command line arguments
  for (const arg of args) {
    switch (arg) {
      case '--draft':
        options.draft = true;
        break;
      case '--prerelease':
        options.prerelease = true;
        break;
      case '--help':
        console.log(`
GitHub Release Creation Tool

Usage: node github-release.js [OPTIONS]

Options:
  --draft        Create as draft release
  --prerelease   Mark as pre-release
  --help         Show this help message

Prerequisites:
  1. GitHub CLI installed and authenticated
  2. Release packages created (run package-release.js first)
  3. Git repository with origin remote

Examples:
  node github-release.js                # Create production release
  node github-release.js --draft        # Create draft release
  node github-release.js --prerelease   # Create pre-release
`);
        process.exit(0);
        break;
    }
  }

  const releaseManager = new GitHubReleaseManager();
  releaseManager.createGitHubRelease(options).catch(error => {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = GitHubReleaseManager;