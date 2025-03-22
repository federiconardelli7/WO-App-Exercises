#!/usr/bin/env node

/**
 * Exercise validation script
 * 
 * This script validates the structure and content of exercise markdown files.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const glob = require('glob');
const Ajv = require('ajv');

// Configuration
const EXERCISES_DIR = path.join(__dirname, '..', 'exercises');
const SCHEMA_PATH = path.join(__dirname, '..', 'schemas', 'exercise.json');

// Load schema for validation
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
const ajv = new Ajv();
const validate = ajv.compile(schema);

/**
 * Parse frontmatter from a markdown file
 * @param {string} filePath - Path to markdown file
 * @returns {Object} Parsed frontmatter
 */
function extractFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  
  if (!frontmatterMatch) {
    throw new Error(`No valid frontmatter found in ${filePath}`);
  }
  
  const frontmatter = frontmatterMatch[1];
  
  // Parse YAML frontmatter
  return yaml.load(frontmatter);
}

/**
 * Validate exercise files
 */
function validateExerciseFiles() {
  const files = glob.sync(`${EXERCISES_DIR}/**/*.md`);
  let validCount = 0;
  let invalidCount = 0;
  
  console.log(`Found ${files.length} markdown files to validate.`);
  
  for (const file of files) {
    // Skip index files
    if (file.endsWith('index.md')) {
      continue;
    }
    
    try {
      const metadata = extractFrontmatter(file);
      const isValid = validate(metadata);
      
      if (isValid) {
        validCount++;
        console.log(`✅ ${file} - Valid`);
      } else {
        invalidCount++;
        console.log(`❌ ${file} - Invalid`);
        console.log('  Validation errors:');
        
        validate.errors.forEach(error => {
          console.log(`  - ${error.instancePath}: ${error.message}`);
        });
      }
    } catch (error) {
      invalidCount++;
      console.log(`❌ ${file} - Error: ${error.message}`);
    }
  }
  
  console.log(`\nValidation complete: ${validCount} valid, ${invalidCount} invalid`);
  
  return invalidCount === 0;
}

// Execute
const isValid = validateExerciseFiles();
process.exit(isValid ? 0 : 1); 