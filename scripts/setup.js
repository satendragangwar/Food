#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Make scripts directory if it doesn't exist
const scriptsDir = path.resolve(__dirname);
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir, { recursive: true });
}

// Make data directory if it doesn't exist
const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Process nutrition data
console.log('\nProcessing nutrition data...');
try {
  // Make the process script executable
  fs.chmodSync(path.resolve(__dirname, 'processNutritionData.js'), '755');
  
  // Run the process script
  execSync('node scripts/processNutritionData.js', { stdio: 'inherit' });
} catch (error) {
  console.error('Error processing nutrition data:', error);
  process.exit(1);
}

console.log('\nSetup completed successfully!');
console.log('You can now run the application with:');
console.log('  npm run cli  - to use the CLI interface');
console.log('  npm start    - to start the API server'); 