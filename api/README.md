# Workout Exercises API

This API provides access to exercise data in both JSON and asset (images, videos) formats, optimized for mobile applications.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Optimize assets (optional but recommended for mobile):
   ```bash
   npm run compress-images
   npm run generate-thumbnails
   ```

3. Generate JSON data from markdown files:
   ```bash
   npm run build
   ```

4. Start the API server:
   ```bash
   npm start
   ```

The server will run at `http://localhost:3000` by default. You can change the port by setting the `PORT` environment variable.

## API Versioning

The API uses versioned endpoints to ensure compatibility as the API evolves. The current version is `v1`.

## API Endpoints

### Version Information

```
GET /api/v1/version
```

Returns the current API and data versions.

**Example Response:**
```json
{
  "version": "1.0.5",
  "apiVersion": "1.0"
}
```

### Get All Exercises

```
GET /api/v1/exercises
```

Returns all exercises in the database with pagination.

**Query Parameters:**
- `category` - Filter by exercise category (e.g., "upper-body", "lower-body")
- `difficulty` - Filter by difficulty level (e.g., "beginner", "intermediate", "advanced")
- `equipment` - Filter by required equipment (e.g., "barbell", "dumbbell", "none")
- `muscle` - Filter by targeted muscle (e.g., "chest", "quadriceps")
- `tags` - Filter by tags, comma-separated (e.g., "compound,bodyweight")
- `page` - Page number for pagination (default: 1)
- `limit` - Number of items per page (default: 20)
- `fields` - Comma-separated list of fields to include in the response (e.g., "id,name,category")

**Example Request:**
```
GET /api/v1/exercises?category=upper-body&difficulty=beginner&page=1&limit=10&fields=id,name,difficulty,images
```

**Example Response:**
```json
{
  "metadata": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "pages": 5,
    "version": "1.0.5"
  },
  "exercises": [
    {
      "id": "push-up",
      "name": "Push-up",
      "difficulty": "beginner",
      "images": ["https://raw.githubusercontent.com/yourusername/WO-App-Exercises/main/assets/images/push-up.jpg"]
    },
    // ... more exercises
  ]
}
```

### Get Exercise by ID

```
GET /api/v1/exercises/:id
```

Returns a specific exercise by its ID.

**Query Parameters:**
- `fields` - Comma-separated list of fields to include in the response

**Example:**
```
GET /api/v1/exercises/push-up?fields=name,instructions,images
```

**Example Response:**
```json
{
  "name": "Push-up",
  "instructions": [
    "Start in a plank position with hands slightly wider than shoulder-width",
    "Lower your body by bending your elbows until your chest nearly touches the floor",
    "Push back up to the starting position",
    "Repeat for the desired number of repetitions"
  ],
  "images": ["https://raw.githubusercontent.com/yourusername/WO-App-Exercises/main/assets/images/push-up.jpg"]
}
```

### Batch Get Multiple Exercises

```
GET /api/v1/exercises/batch?ids=id1,id2,id3
```

Retrieves multiple exercises in a single request.

**Query Parameters:**
- `ids` - Comma-separated list of exercise IDs

**Example:**
```
GET /api/v1/exercises/batch?ids=push-up,squat,plank
```

**Example Response:**
```json
{
  "exercises": [
    {
      "id": "push-up",
      "name": "Push-up",
      // ... rest of exercise data
    },
    {
      "id": "squat",
      "name": "Squat",
      // ... rest of exercise data
    },
    {
      "id": "plank",
      "name": "Plank",
      // ... rest of exercise data
    }
  ]
}
```

### Search Exercises

```
GET /api/v1/search
```

Searches for exercises with multiple criteria.

**Query Parameters:**
- `query` - Text search term
- `category` - Filter by category
- `difficulty` - Filter by difficulty
- `equipment` - Filter by equipment
- `muscle` - Filter by targeted muscle
- `page` - Page number for pagination (default: 1)
- `limit` - Number of items per page (default: 20)

**Example:**
```
GET /api/v1/search?query=chest&difficulty=beginner
```

**Example Response:**
```json
{
  "metadata": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "pages": 1
  },
  "exercises": [
    {
      "id": "push-up",
      "name": "Push-up",
      // ... rest of exercise data
    },
    // ... more matching exercises
  ]
}
```

### Get Categories

```
GET /api/v1/categories
```

Returns all available exercise categories.

**Example Response:**
```json
{
  "categories": [
    { "id": "upper-body", "name": "Upper Body" },
    { "id": "lower-body", "name": "Lower Body" },
    { "id": "core", "name": "Core" },
    { "id": "cardio", "name": "Cardio" },
    { "id": "flexibility", "name": "Flexibility" }
  ]
}
```

### Get Muscles

```
GET /api/v1/muscles
```

Returns all muscles targeted across all exercises.

**Example Response:**
```json
{
  "muscles": [
    "abdominals",
    "biceps",
    "calves",
    "chest",
    "glutes",
    "hamstrings",
    "quadriceps",
    "shoulders",
    "triceps"
    // ... more muscles
  ]
}
```

## Static Assets

Static assets (images, videos, GIFs) are served from:

```
GET /assets/images/:filename
GET /assets/videos/:filename
GET /assets/gifs/:filename
```

Thumbnails are available with the `-thumb` suffix:
```
GET /assets/images/push-up-thumb.jpg
```

## Caching and Performance

The API implements several optimizations for mobile clients:

1. **Response compression** - All responses are compressed to reduce transfer size
2. **HTTP caching** - Appropriate cache headers are set (1 hour for data, 24 hours for static assets)
3. **Version headers** - The `X-Data-Version` header indicates the current data version
4. **Thumbnails** - Smaller image versions for list views and previews
5. **Field selection** - Request only the fields you need with the `fields` parameter
6. **Pagination** - Control result size with `page` and `limit` parameters

## Mobile Integration

### Efficient Data Loading

For optimal mobile performance, consider these strategies:

1. **Initial sync** - Load essential data on first launch
   ```javascript
   const initialSync = async () => {
     // Get data version first
     const versionRes = await fetch('https://your-api-url.com/api/v1/version');
     const { version } = await versionRes.json();
     
     // Check if we need to update cached data
     const cachedVersion = await AsyncStorage.getItem('data-version');
     if (cachedVersion !== version) {
       // Get categories and minimal exercise data for browsing
       const [categoriesRes, exercisesRes] = await Promise.all([
         fetch('https://your-api-url.com/api/v1/categories'),
         fetch('https://your-api-url.com/api/v1/exercises?fields=id,name,category,difficulty,mobile')
       ]);
       
       const categories = await categoriesRes.json();
       const exercises = await exercisesRes.json();
       
       // Cache the data
       await AsyncStorage.setItem('categories', JSON.stringify(categories));
       await AsyncStorage.setItem('exercises-minimal', JSON.stringify(exercises));
       await AsyncStorage.setItem('data-version', version);
     }
   };
   ```

2. **Lazy loading** - Load full exercise details only when needed
   ```javascript
   const getExerciseDetails = async (exerciseId) => {
     // Try to get from cache first
     const cachedExercise = await AsyncStorage.getItem(`exercise-${exerciseId}`);
     if (cachedExercise) {
       return JSON.parse(cachedExercise);
     }
     
     // Not in cache, fetch from API
     const response = await fetch(`https://your-api-url.com/api/v1/exercises/${exerciseId}`);
     const exercise = await response.json();
     
     // Cache for future use
     await AsyncStorage.setItem(`exercise-${exerciseId}`, JSON.stringify(exercise));
     
     return exercise;
   };
   ```

3. **Image optimization** - Use thumbnails for lists, full images for details
   ```javascript
   // In your list component
   const ExerciseListItem = ({ exercise }) => (
     <View>
       <Image 
         source={{ uri: exercise.mobile.thumbnails[0] }} 
         style={styles.thumbnail} 
       />
       <Text>{exercise.name}</Text>
     </View>
   );
   
   // In your detail component
   const ExerciseDetail = ({ exercise }) => (
     <View>
       <Image 
         source={{ uri: exercise.images[0] }} 
         style={styles.fullImage} 
       />
       {/* ... rest of detail view */}
     </View>
   );
   ```

4. **Offline support** - Implement a complete offline experience
   ```javascript
   const offlineDataSync = async () => {
     // Check if we're online
     const isConnected = await NetInfo.fetch().then(state => state.isConnected);
     
     if (isConnected) {
       // We're online, check if there's a new version
       try {
         const res = await fetch('https://your-api-url.com/api/v1/version');
         const { version } = await res.json();
         const currentVersion = await AsyncStorage.getItem('data-version');
         
         if (version !== currentVersion) {
           // New version available, sync data
           await syncAllData();
         }
       } catch (error) {
         console.error('Error checking version:', error);
         // Continue with cached data
       }
     }
     
     // Return cached data regardless
     return {
       categories: JSON.parse(await AsyncStorage.getItem('categories') || '{"categories":[]}'),
       exercises: JSON.parse(await AsyncStorage.getItem('exercises-minimal') || '{"exercises":[]}')
     };
   };
   ``` 