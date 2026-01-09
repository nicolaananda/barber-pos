#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
    // Get Git metadata
    const commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim();
    const commitHash = execSync('git log -1 --format=%h', { encoding: 'utf-8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    const timestamp = new Date().toISOString();

    // Generate version object
    const version = {
        major: 1,
        minor: 0,
        patch: parseInt(commitCount, 10),
        hash: commitHash,
        branch: branch,
        timestamp: timestamp,
        full: `v1.0.${commitCount}+${commitHash}`
    };

    // Write to src/version.json
    const outputPath = path.join(__dirname, 'src', 'version.json');
    fs.writeFileSync(outputPath, JSON.stringify(version, null, 2));

    console.log(`✓ Version generated: ${version.full}`);
    console.log(`  Commit: ${commitHash} (${branch})`);
    console.log(`  Build: ${timestamp}`);
} catch (error) {
    console.error('Failed to generate version:', error.message);
    // Create fallback version
    const fallback = {
        major: 1,
        minor: 0,
        patch: 0,
        hash: 'unknown',
        branch: 'unknown',
        timestamp: new Date().toISOString(),
        full: 'v1.0.0+unknown'
    };
    const outputPath = path.join(__dirname, 'src', 'version.json');
    fs.writeFileSync(outputPath, JSON.stringify(fallback, null, 2));
    console.log('⚠ Using fallback version');
}
