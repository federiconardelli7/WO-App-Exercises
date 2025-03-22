#!/usr/bin/env node

/**
 * Image compression script for exercise assets
 * 
 * This script optimizes images in the assets directory for better 
 * mobile performance by reducing file sizes while maintaining quality.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const sharp = require('sharp');

// Configuration
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const IMAGES_DIR = path.join(ASSETS_DIR, 'images');
const QUALITY = 80; // JPEG quality (0-100)
const MAX_WIDTH = 1200; // Maximum width for full-size images

// Ensure directories exist
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

/**
 * Compress and optimize an image
 * @param {string} filePath - Path to the image file
 * @returns {Promise<Object>} - Optimization results
 */
async function optimizeImage(filePath) {
  const filename = path.basename(filePath);
  const outputPath = path.join(IMAGES_DIR, filename);
  
  // Skip if already optimized (check if filename contains -optimized)
  if (filename.includes('-optimized')) {
    return { 
      file: filename, 
      skipped: true, 
      reason: 'Already optimized' 
    };
  }
  
  // Get original file stats
  const originalStats = fs.statSync(filePath);
  const originalSize = originalStats.size;
  
  try {
    // Process with sharp
    const image = sharp(filePath);
    const metadata = await image.metadata();
    
    // Resize if larger than max width
    if (metadata.width > MAX_WIDTH) {
      image.resize({ width: MAX_WIDTH, withoutEnlargement: true });
    }
    
    // Apply appropriate compression based on format
    let optimizedImage;
    if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
      optimizedImage = await image
        .jpeg({ quality: QUALITY, progressive: true })
        .toBuffer();
    } else if (metadata.format === 'png') {
      optimizedImage = await image
        .png({ compressionLevel: 9, progressive: true })
        .toBuffer();
    } else if (metadata.format === 'webp') {
      optimizedImage = await image
        .webp({ quality: QUALITY })
        .toBuffer();
    } else {
      // Unsupported format, just copy the file
      fs.copyFileSync(filePath, outputPath);
      return { 
        file: filename, 
        skipped: true, 
        reason: `Unsupported format: ${metadata.format}` 
      };
    }
    
    // Write the optimized image
    fs.writeFileSync(outputPath, optimizedImage);
    
    // Get optimized file stats
    const optimizedStats = fs.statSync(outputPath);
    const optimizedSize = optimizedStats.size;
    const savings = originalSize - optimizedSize;
    const savingsPercent = ((savings / originalSize) * 100).toFixed(2);
    
    return {
      file: filename,
      originalSize,
      optimizedSize,
      savings,
      savingsPercent: `${savingsPercent}%`
    };
  } catch (error) {
    console.error(`Error optimizing ${filename}:`, error);
    return { 
      file: filename, 
      error: error.message 
    };
  }
}

/**
 * Process all images in the assets directory
 */
async function processImages() {
  // Find all image files
  const imageFiles = [
    ...glob.sync(`${ASSETS_DIR}/**/*.jpg`),
    ...glob.sync(`${ASSETS_DIR}/**/*.jpeg`),
    ...glob.sync(`${ASSETS_DIR}/**/*.png`),
    ...glob.sync(`${ASSETS_DIR}/**/*.webp`)
  ];
  
  console.log(`Found ${imageFiles.length} images to process.`);
  
  const results = [];
  let totalSavings = 0;
  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  let processedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  // Process each image
  for (const file of imageFiles) {
    const result = await optimizeImage(file);
    results.push(result);
    
    if (result.error) {
      errorCount++;
    } else if (result.skipped) {
      skippedCount++;
    } else {
      processedCount++;
      totalOriginalSize += result.originalSize;
      totalOptimizedSize += result.optimizedSize;
      totalSavings += result.savings;
      
      console.log(`Optimized ${result.file}: ${result.savingsPercent} reduction`);
    }
  }
  
  // Calculate overall statistics
  const overallSavingsPercent = totalOriginalSize > 0 
    ? ((totalSavings / totalOriginalSize) * 100).toFixed(2) 
    : 0;
  
  console.log('\nOptimization complete!');
  console.log(`Processed: ${processedCount} images`);
  console.log(`Skipped: ${skippedCount} images`);
  console.log(`Errors: ${errorCount} images`);
  
  if (processedCount > 0) {
    console.log(`Total size before: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total size after: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total savings: ${(totalSavings / 1024 / 1024).toFixed(2)} MB (${overallSavingsPercent}%)`);
  }
}

// Execute
processImages().catch(error => {
  console.error('Error processing images:', error);
  process.exit(1);
}); 