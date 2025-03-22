/**
 * Enhanced Express API for serving exercise data
 * Optimized for mobile applications with versioning, pagination, and caching
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = '1.0';
const CACHE_DURATION = 60 * 60; // 1 hour in seconds

// Create data directory if it doesn't exist
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Get data version from version.json or generate it if it doesn't exist
let dataVersion = '1.0.0';
const versionPath = path.join(DATA_DIR, 'version.json');
if (fs.existsSync(versionPath)) {
  dataVersion = JSON.parse(fs.readFileSync(versionPath, 'utf8')).version;
} else {
  fs.writeFileSync(versionPath, JSON.stringify({ version: dataVersion }, null, 2));
}

// Middleware
app.use(cors());
app.use(compression()); // Compress responses
app.use(express.json());

// Set cache headers
const setCacheHeaders = (res) => {
  res.set('Cache-Control', `public, max-age=${CACHE_DURATION}`);
  res.set('X-Data-Version', dataVersion);
};

// Error handler
const errorHandler = (res, error, message = 'Server error') => {
  console.error(error);
  res.status(500).json({ error: message });
};

// Serve static assets with caching
app.use('/assets', (req, res, next) => {
  res.set('Cache-Control', `public, max-age=${CACHE_DURATION * 24}`); // 24 hours for assets
  next();
}, express.static(path.join(__dirname, '..', 'assets')));

// API version prefix
const apiRoute = '/api/v1';

// Get data version
app.get(`${apiRoute}/version`, (req, res) => {
  setCacheHeaders(res);
  res.json({ version: dataVersion, apiVersion: API_VERSION });
});

// Get all exercises with pagination
app.get(`${apiRoute}/exercises`, (req, res) => {
  try {
    const filePath = path.join(DATA_DIR, 'exercises.json');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'No exercise data found. Run the conversion script first.' });
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let { exercises } = data;
    
    // Apply filters
    if (req.query.category) {
      exercises = exercises.filter(ex => ex.category === req.query.category);
    }
    
    if (req.query.difficulty) {
      exercises = exercises.filter(ex => ex.difficulty === req.query.difficulty);
    }
    
    if (req.query.equipment) {
      exercises = exercises.filter(ex => 
        ex.equipment && ex.equipment.includes(req.query.equipment)
      );
    }

    if (req.query.muscle) {
      exercises = exercises.filter(ex => 
        (ex.primaryMuscles && ex.primaryMuscles.includes(req.query.muscle)) ||
        (ex.secondaryMuscles && ex.secondaryMuscles.includes(req.query.muscle))
      );
    }

    if (req.query.tags) {
      const tags = req.query.tags.split(',');
      exercises = exercises.filter(ex => 
        ex.tags && tags.some(tag => ex.tags.includes(tag))
      );
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    const paginatedExercises = exercises.slice(startIndex, endIndex);
    
    // Response with metadata
    const response = {
      metadata: {
        total: exercises.length,
        page,
        limit,
        pages: Math.ceil(exercises.length / limit),
        version: dataVersion
      },
      exercises: paginatedExercises
    };
    
    // Field selection
    if (req.query.fields) {
      const fields = req.query.fields.split(',');
      response.exercises = paginatedExercises.map(ex => {
        const filtered = {};
        fields.forEach(field => {
          if (ex[field] !== undefined) {
            filtered[field] = ex[field];
          }
        });
        return filtered;
      });
    }
    
    setCacheHeaders(res);
    res.json(response);
  } catch (error) {
    errorHandler(res, error, 'Error retrieving exercises');
  }
});

// Get specific exercise by ID
app.get(`${apiRoute}/exercises/:id`, (req, res) => {
  try {
    const filePath = path.join(DATA_DIR, `${req.params.id}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    
    const exercise = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Field selection
    if (req.query.fields) {
      const fields = req.query.fields.split(',');
      const filtered = {};
      
      fields.forEach(field => {
        if (exercise[field] !== undefined) {
          filtered[field] = exercise[field];
        }
      });
      
      setCacheHeaders(res);
      return res.json(filtered);
    }
    
    setCacheHeaders(res);
    res.json(exercise);
  } catch (error) {
    errorHandler(res, error, 'Error retrieving exercise');
  }
});

// Batch get multiple exercises by IDs
app.get(`${apiRoute}/exercises/batch`, (req, res) => {
  try {
    if (!req.query.ids) {
      return res.status(400).json({ error: 'IDs parameter is required' });
    }
    
    const ids = req.query.ids.split(',');
    const exercises = [];
    
    for (const id of ids) {
      const filePath = path.join(DATA_DIR, `${id}.json`);
      
      if (fs.existsSync(filePath)) {
        exercises.push(JSON.parse(fs.readFileSync(filePath, 'utf8')));
      }
    }
    
    setCacheHeaders(res);
    res.json({ exercises });
  } catch (error) {
    errorHandler(res, error, 'Error retrieving exercises batch');
  }
});

// Enhanced search with multiple criteria
app.get(`${apiRoute}/search`, (req, res) => {
  try {
    const { query, category, difficulty, equipment, muscle } = req.query;
    
    if (!query && !category && !difficulty && !equipment && !muscle) {
      return res.status(400).json({ error: 'At least one search parameter is required' });
    }
    
    const filePath = path.join(DATA_DIR, 'exercises.json');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'No exercise data found' });
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let results = [...data.exercises];
    
    // Text search
    if (query) {
      const searchQuery = query.toLowerCase();
      results = results.filter(ex => 
        ex.name.toLowerCase().includes(searchQuery) ||
        (ex.description && ex.description.toLowerCase().includes(searchQuery)) ||
        (ex.tags && ex.tags.some(tag => tag.toLowerCase().includes(searchQuery)))
      );
    }
    
    // Category filter
    if (category) {
      results = results.filter(ex => ex.category === category);
    }
    
    // Difficulty filter
    if (difficulty) {
      results = results.filter(ex => ex.difficulty === difficulty);
    }
    
    // Equipment filter
    if (equipment) {
      results = results.filter(ex => 
        ex.equipment && ex.equipment.includes(equipment)
      );
    }
    
    // Muscle filter
    if (muscle) {
      results = results.filter(ex => 
        (ex.primaryMuscles && ex.primaryMuscles.includes(muscle)) ||
        (ex.secondaryMuscles && ex.secondaryMuscles.includes(muscle))
      );
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    const paginatedResults = results.slice(startIndex, endIndex);
    
    setCacheHeaders(res);
    res.json({
      metadata: {
        total: results.length,
        page,
        limit,
        pages: Math.ceil(results.length / limit)
      },
      exercises: paginatedResults
    });
  } catch (error) {
    errorHandler(res, error, 'Error searching exercises');
  }
});

// Get exercise categories
app.get(`${apiRoute}/categories`, (req, res) => {
  try {
    const categories = [
      { id: 'upper-body', name: 'Upper Body' },
      { id: 'lower-body', name: 'Lower Body' },
      { id: 'core', name: 'Core' },
      { id: 'cardio', name: 'Cardio' },
      { id: 'flexibility', name: 'Flexibility' }
    ];
    
    setCacheHeaders(res);
    res.json({ categories });
  } catch (error) {
    errorHandler(res, error, 'Error retrieving categories');
  }
});

// Get all muscles
app.get(`${apiRoute}/muscles`, (req, res) => {
  try {
    const filePath = path.join(DATA_DIR, 'exercises.json');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'No exercise data found' });
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const muscleSet = new Set();
    
    data.exercises.forEach(exercise => {
      if (exercise.primaryMuscles) {
        exercise.primaryMuscles.forEach(muscle => muscleSet.add(muscle));
      }
      
      if (exercise.secondaryMuscles) {
        exercise.secondaryMuscles.forEach(muscle => muscleSet.add(muscle));
      }
    });
    
    const muscles = Array.from(muscleSet).sort();
    
    setCacheHeaders(res);
    res.json({ muscles });
  } catch (error) {
    errorHandler(res, error, 'Error retrieving muscles');
  }
});

// Root route - API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'Workout Exercises API',
    version: API_VERSION,
    dataVersion: dataVersion,
    documentation: 'https://github.com/yourusername/WO-App-Exercises/blob/main/api/README.md',
    endpoints: [
      { path: `${apiRoute}/version`, description: 'Get API and data version information' },
      { path: `${apiRoute}/exercises`, description: 'Get all exercises with filtering and pagination' },
      { path: `${apiRoute}/exercises/:id`, description: 'Get a specific exercise by ID' },
      { path: `${apiRoute}/exercises/batch`, description: 'Get multiple exercises by IDs' },
      { path: `${apiRoute}/search`, description: 'Search exercises with multiple criteria' },
      { path: `${apiRoute}/categories`, description: 'Get all exercise categories' },
      { path: `${apiRoute}/muscles`, description: 'Get all muscles targeted by exercises' }
    ]
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
}); 