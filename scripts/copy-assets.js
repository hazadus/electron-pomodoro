#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Cross-platform asset copying script for Electron application.
 * Creates necessary directories and copies assets to dist folder.
 */

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

function copyFile(src, dest) {
  try {
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${src} → ${dest}`);
  } catch (error) {
    console.error(`Error copying ${src}: ${error.message}`);
    process.exit(1);
  }
}

function copyFiles(srcDir, destDir, pattern = '*') {
  if (!fs.existsSync(srcDir)) {
    console.warn(`Source directory not found: ${srcDir}`);
    return;
  }

  const files = fs.readdirSync(srcDir);
  files.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);
    
    if (fs.statSync(srcPath).isFile()) {
      copyFile(srcPath, destPath);
    }
  });
}

// Ensure dist directory exists
ensureDir('dist');

// Copy HTML files
ensureDir('dist/windows');
copyFiles('src/windows', 'dist/windows');

// Copy icons
ensureDir('dist/assets/icons');
copyFiles('assets/icons', 'dist/assets/icons');

// Copy sounds
ensureDir('dist/assets/sounds');
copyFiles('assets/sounds', 'dist/assets/sounds');

// Copy images
ensureDir('dist/assets/images');
copyFiles('assets/images', 'dist/assets/images');

// Copy buildinfo.json if it exists
const buildInfoSrc = path.join(__dirname, '..', 'buildinfo.json');
const buildInfoDest = path.join(__dirname, '..', 'dist', 'buildinfo.json');
if (fs.existsSync(buildInfoSrc)) {
  copyFile(buildInfoSrc, buildInfoDest);
} else {
  console.log('buildinfo.json not found, skipping...');
}

console.log('Asset copying completed successfully!');