#!/usr/bin/env node

/**
 * Enhanced Markdown to JSON converter for exercise files
 * 
 * This script traverses the exercises directory, parses markdown files,
 * generates optimized JSON files, and maintains version tracking.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const marked = require('marked');
const glob = require('glob');
const Ajv = require('ajv');
const crypto = require('crypto');

// Configuration
const EXERCISES_DIR = path.join(__dirname, '..', 'exercises');
const OUTPUT_DIR = path.join(__dirname, '..', 'api', 'data');
const SCHEMA_PATH = path.join(__dirname, '..', 'schemas', 'exercise.json');
const BASE_URL = process.env.BASE_URL || 'https://raw.githubusercontent.com/yourusername/WO-App-Exercises/main';

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Load schema for validation
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
const ajv = new Ajv();
const validate = ajv.compile(schema);

// Get current version or create if it doesn't exist
let currentVersion = '1.0.0';
const versionPath = path.join(OUTPUT_DIR, 'version.json');
if (fs.existsSync(versionPath)) {
  const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
  currentVersion = versionData.version;
}

/**
 * Calculate hash of content for version tracking
 * @param {string} content - Content to hash
 * @returns {string} MD5 hash
 */
function calculateHash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Parse markdown file with YAML frontmatter
 * @param {string} filePath - Path to markdown file
 * @returns {Object} Parsed data
 */
function parseMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (!frontmatterMatch) {
    throw new Error(`No valid frontmatter found in ${filePath}`);
  }
  
  const [, frontmatter, markdown] = frontmatterMatch;
  
  // Parse YAML frontmatter
  const metadata = yaml.load(frontmatter);
  
  // Parse markdown content
  const tokens = marked.lexer(markdown);
  
  // Extract sections from markdown
  const sections = {};
  let currentSection = null;
  
  for (const token of tokens) {
    if (token.type === 'heading') {
      currentSection = token.text.toLowerCase();
      sections[currentSection] = [];
    } else if (currentSection && (token.type === 'paragraph' || token.type === 'list')) {
      if (token.type === 'list') {
        sections[currentSection] = token.items.map(item => item.text);
      } else {
        sections[currentSection].push(token.text);
      }
    }
  }
  
  // Generate absolute URLs for assets
  const images = extractImageLinks(markdown).map(imgPath => {
    // Convert relative paths to absolute URLs
    if (imgPath.startsWith('../')) {
      return `${BASE_URL}/${imgPath.replace(/^\.\.\//, '')}`;
    }
    return imgPath;
  });
  
  const videos = extractVideoLinks(markdown).map(videoPath => {
    if (videoPath.startsWith('../')) {
      return `${BASE_URL}/${videoPath.replace(/^\.\.\//, '')}`;
    }
    return videoPath;
  });
  
  // Add metadata for mobile optimization
  const category = metadata.category;
  const difficulty = metadata.difficulty;
  
  // Generate a thumbnail path (assuming there's a thumbnail version of each image)
  const thumbnails = images.map(imgPath => {
    const pathParts = imgPath.split('.');
    const ext = pathParts.pop();
    return `${pathParts.join('.')}-thumb.${ext}`;
  });
  
  // Add mobile-specific metadata
  const mobileMetadata = {
    displayOrder: getDifficultyOrder(difficulty),
    categoryDisplayName: getCategoryDisplayName(category),
    estimatedTime: estimateExerciseTime(metadata),
    hasVideo: videos.length > 0,
    thumbnails
  };
  
  // Combine metadata with parsed sections
  return {
    ...metadata,
    description: sections.description ? sections.description.join('\n') : '',
    instructions: sections.instructions || [],
    tips: sections.tips || [],
    variations: sections.variations || [],
    images,
    videos,
    mobile: mobileMetadata,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Get display order based on difficulty
 * @param {string} difficulty - Exercise difficulty
 * @returns {number} Display order value
 */
function getDifficultyOrder(difficulty) {
  switch (difficulty) {
    case 'beginner': return 1;
    case 'intermediate': return 2;
    case 'advanced': return 3;
    default: return 999;
  }
}

/**
 * Get human-readable category name
 * @param {string} category - Category ID
 * @returns {string} Display name
 */
function getCategoryDisplayName(category) {
  const categoryMap = {
    'upper-body': 'Upper Body',
    'lower-body': 'Lower Body',
    'core': 'Core',
    'cardio': 'Cardio',
    'flexibility': 'Flexibility'
  };
  
  return categoryMap[category] || category;
}

/**
 * Estimate exercise time based on metadata
 * @param {Object} metadata - Exercise metadata
 * @returns {number} Estimated time in seconds
 */
function estimateExerciseTime(metadata) {
  // Default time estimates
  const baseTime = 30; // 30 seconds per exercise
  
  // Adjust based on difficulty
  let difficultyMultiplier = 1;
  if (metadata.difficulty === 'intermediate') difficultyMultiplier = 1.2;
  if (metadata.difficulty === 'advanced') difficultyMultiplier = 1.5;
  
  return Math.round(baseTime * difficultyMultiplier);
}

/**
 * Extract image links from markdown
 * @param {string} markdown - Markdown content
 * @returns {Array<string>} Array of image paths
 */
function extractImageLinks(markdown) {
  const regex = /!\[(.*?)\]\((.*?)\)/g;
  const matches = [];
  let match;
  
  while ((match = regex.exec(markdown)) !== null) {
    matches.push(match[2]);
  }
  
  return matches;
}

/**
 * Extract video links from markdown
 * @param {string} markdown - Markdown content
 * @returns {Array<string>} Array of video paths
 */
function extractVideoLinks(markdown) {
  const regex = /\[.*?[vV]ideo.*?\]\((.*?)\)/g;
  const matches = [];
  let match;
  
  while ((match = regex.exec(markdown)) !== null) {
    matches.push(match[1]);
  }
  
  return matches;
}

/**
 * Build muscle reference data
 * @param {Array} exercises - All exercises
 * @returns {Object} Muscle reference data
 */
function buildMuscleReference(exercises) {
  const muscles = {};
  
  exercises.forEach(exercise => {
    // Process primary muscles
    if (exercise.primaryMuscles) {
      exercise.primaryMuscles.forEach(muscle => {
        if (!muscles[muscle]) {
          muscles[muscle] = { name: muscle, exercises: [] };
        }
        
        muscles[muscle].exercises.push({
          id: exercise.id,
          name: exercise.name,
          isPrimary: true
        });
      });
    }
    
    // Process secondary muscles
    if (exercise.secondaryMuscles) {
      exercise.secondaryMuscles.forEach(muscle => {
        if (!muscles[muscle]) {
          muscles[muscle] = { name: muscle, exercises: [] };
        }
        
        // Only add if not already added as primary
        const alreadyAdded = muscles[muscle].exercises.some(ex => ex.id === exercise.id);
        if (!alreadyAdded) {
          muscles[muscle].exercises.push({
            id: exercise.id,
            name: exercise.name,
            isPrimary: false
          });
        }
      });
    }
  });
  
  return Object.values(muscles);
}

/**
 * Process all markdown files and generate JSON data
 */
function processExerciseFiles() {
  const files = glob.sync(`${EXERCISES_DIR}/**/*.md`);
  const exercises = [];
  let validCount = 0;
  let invalidCount = 0;
  let hasChanges = false;
  
  console.log(`Found ${files.length} markdown files to process.`);
  
  // Load previous hash values if available
  let previousHashes = {};
  const hashFilePath = path.join(OUTPUT_DIR, 'file-hashes.json');
  if (fs.existsSync(hashFilePath)) {
    previousHashes = JSON.parse(fs.readFileSync(hashFilePath, 'utf8'));
  }
  
  // Store current hashes
  const currentHashes = {};
  
  for (const file of files) {
    // Skip index files
    if (file.endsWith('index.md')) {
      continue;
    }
    
    try {
      const content = fs.readFileSync(file, 'utf8');
      const fileHash = calculateHash(content);
      currentHashes[file] = fileHash;
      
      // Check if file changed
      if (previousHashes[file] !== fileHash) {
        hasChanges = true;
      }
      
      const exerciseData = parseMarkdownFile(file);
      
      // Validate against schema
      const isValid = validate(exerciseData);
      
      if (isValid) {
        exercises.push(exerciseData);
        validCount++;
      } else {
        console.error(`Validation failed for ${file}`);
        console.error(validate.errors);
        invalidCount++;
      }
    } catch (error) {
      console.error(`Error processing ${file}: ${error.message}`);
      invalidCount++;
    }
  }
  
  // Update version if changes detected
  if (hasChanges) {
    const versionParts = currentVersion.split('.');
    const patch = parseInt(versionParts[2]) + 1;
    currentVersion = `${versionParts[0]}.${versionParts[1]}.${patch}`;
    console.log(`Detected changes, updating version to ${currentVersion}`);
  }
  
  // Save current file hashes
  fs.writeFileSync(hashFilePath, JSON.stringify(currentHashes, null, 2));
  
  // Save version information
  fs.writeFileSync(
    versionPath, 
    JSON.stringify({ 
      version: currentVersion,
      lastUpdated: new Date().toISOString(),
      exerciseCount: validCount
    }, null, 2)
  );
  
  // Generate additional index files
  const muscleData = buildMuscleReference(exercises);
  
  // Get unique categories
  const categories = [...new Set(exercises.map(ex => ex.category))].map(cat => ({
    id: cat,
    name: getCategoryDisplayName(cat),
    count: exercises.filter(ex => ex.category === cat).length
  }));
  
  // Get unique equipment
  const equipmentSet = new Set();
  exercises.forEach(ex => {
    if (ex.equipment && Array.isArray(ex.equipment)) {
      ex.equipment.forEach(eq => equipmentSet.add(eq));
    }
  });
  const equipment = Array.from(equipmentSet).sort().map(eq => ({
    id: eq,
    name: eq.charAt(0).toUpperCase() + eq.slice(1),
    count: exercises.filter(ex => ex.equipment && ex.equipment.includes(eq)).length
  }));
  
  // Write all exercises to a single JSON file
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'exercises.json'),
    JSON.stringify({ 
      version: currentVersion,
      lastUpdated: new Date().toISOString(),
      count: exercises.length,
      exercises 
    }, null, 2)
  );
  
  // Write index files
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'muscles.json'),
    JSON.stringify({ muscles: muscleData }, null, 2)
  );
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'categories.json'),
    JSON.stringify({ categories }, null, 2)
  );
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'equipment.json'),
    JSON.stringify({ equipment }, null, 2)
  );
  
  // Write individual exercise files
  for (const exercise of exercises) {
    fs.writeFileSync(
      path.join(OUTPUT_DIR, `${exercise.id}.json`),
      JSON.stringify(exercise, null, 2)
    );
  }
  
  console.log(`\nProcessing complete: ${validCount} valid, ${invalidCount} invalid`);
  console.log(`Output written to ${OUTPUT_DIR}`);
  console.log(`Current version: ${currentVersion}`);
}

// Execute
processExerciseFiles(); 