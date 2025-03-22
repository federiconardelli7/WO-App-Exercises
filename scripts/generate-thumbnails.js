#!/usr/bin/env node

/**
 * Thumbnail generator script for exercise assets
 * 
 * This script creates smaller thumbnail versions of images for faster
 * mobile loading and reduced data usage.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const sharp = require('sharp');

// Configuration
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const IMAGES_DIR = path.join(ASSETS_DIR, 'images');
const THUMB_WIDTH = 300; // Width for thumbnails
const THUMB_QUALITY = 75; // JPEG quality for thumbnails

// Ensure directories exist
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

/**
 * Generate a thumbnail from an image
 * @param {string} filePath - Path to the image file
 * @returns {Promise<Object>} - Results of the thumbnail generation
 */
async function generateThumbnail(filePath) {
  const filename = path.basename(filePath);
  const fileExt = path.extname(filename);
  const baseName = path.basename(filename, fileExt);
  const thumbName = `${baseName}-thumb${fileExt}`;
  const outputPath = path.join(IMAGES_DIR, thumbName);
  
  // Skip if thumbnail already exists and is newer than the source
  if (fs.existsSync(outputPath)) {
    const srcStats = fs.statSync(filePath);
    const thumbStats = fs.statSync(outputPath);
    
    if (thumbStats.mtime >= srcStats.mtime) {
      return {
        file: filename,
        thumbnail: thumbName,
        skipped: true,
        reason: 'Thumbnail is up to date'
      };
    }
  }
  
  // Skip if already a thumbnail
  if (baseName.endsWith('-thumb')) {
    return {
      file: filename,
      skipped: true,
      reason: 'Already a thumbnail'
    };
  }
  
  try {
    // Process with sharp
    const image = sharp(filePath);
    const metadata = await image.metadata();
    
    // Format-specific output
    let thumbnailImage;
    if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
      thumbnailImage = await image
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: THUMB_QUALITY })
        .toBuffer();
    } else if (metadata.format === 'png') {
      thumbnailImage = await image
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .png({ compressionLevel: 9 })
        .toBuffer();
    } else if (metadata.format === 'webp') {
      thumbnailImage = await image
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toBuffer();
    } else {
      return {
        file: filename,
        skipped: true,
        reason: `Unsupported format: ${metadata.format}`
      };
    }
    
    // Write the thumbnail
    fs.writeFileSync(outputPath, thumbnailImage);
    
    // Get original and thumbnail file sizes
    const originalSize = fs.statSync(filePath).size;
    const thumbSize = fs.statSync(outputPath).size;
    const savings = originalSize - thumbSize;
    const savingsPercent = ((savings / originalSize) * 100).toFixed(2);
    
    return {
      file: filename,
      thumbnail: thumbName,
      originalSize,
      thumbnailSize: thumbSize,
      savings,
      savingsPercent: `${savingsPercent}%`,
      dimensions: {
        original: {
          width: metadata.width,
          height: metadata.height
        },
        thumbnail: {
          width: Math.min(THUMB_WIDTH, metadata.width),
          height: Math.round((Math.min(THUMB_WIDTH, metadata.width) / metadata.width) * metadata.height)
        }
      }
    };
  } catch (error) {
    console.error(`Error generating thumbnail for ${filename}:`, error);
    return {
      file: filename,
      error: error.message
    };
  }
}

/**
 * Process all images and generate thumbnails
 */
async function generateThumbnails() {
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
  let processedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  // Process each image
  for (const file of imageFiles) {
    const result = await generateThumbnail(file);
    results.push(result);
    
    if (result.error) {
      errorCount++;
    } else if (result.skipped) {
      skippedCount++;
    } else {
      processedCount++;
      totalSavings += result.savings;
      
      console.log(`Generated thumbnail for ${result.file}: ${result.thumbnail} (${result.savingsPercent} smaller)`);
    }
  }
  
  console.log('\nThumbnail generation complete!');
  console.log(`Processed: ${processedCount} images`);
  console.log(`Skipped: ${skippedCount} images`);
  console.log(`Errors: ${errorCount} images`);
  
  if (processedCount > 0) {
    console.log(`Total savings: ${(totalSavings / 1024 / 1024).toFixed(2)} MB`);
  }
  
  // Write thumbnail manifest for easy lookup in applications
  const thumbnailManifest = results
    .filter(result => !result.error && !result.skipped)
    .reduce((acc, result) => {
      acc[result.file] = {
        thumbnail: result.thumbnail,
        dimensions: result.dimensions
      };
      return acc;
    }, {});
  
  fs.writeFileSync(
    path.join(ASSETS_DIR, 'thumbnails.json'),
    JSON.stringify(thumbnailManifest, null, 2)
  );
  
  console.log(`Thumbnail manifest written to ${path.join(ASSETS_DIR, 'thumbnails.json')}`);
}

// Execute
generateThumbnails().catch(error => {
  console.error('Error generating thumbnails:', error);
  process.exit(1);
}); 