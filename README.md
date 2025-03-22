# Workout App Exercises Repository

This repository contains a collection of exercises, skills, and workout routines for fitness training applications. Each exercise is documented in markdown format with detailed descriptions, images, videos, and metadata.

## Repository Structure

```
WO-App-Exercises/
├── exercises/               # Individual exercise files
│   ├── categories/          # Organized by muscle groups/movement types
│   │   ├── upper-body/
│   │   ├── lower-body/
│   │   ├── core/
│   │   └── ...
│   └── index.md             # Overview of all exercises
├── skills/                  # Special skills documentation
├── routines/                # Pre-defined workout routines
├── assets/                  # Static assets (images, videos)
│   ├── images/
│   ├── videos/
│   └── gifs/
├── schemas/                 # JSON schemas for data validation
├── scripts/                 # Utility scripts for conversion/validation
│   ├── md-to-json.js        # Convert markdown to JSON
│   └── validate.js          # Validate exercise formats
└── api/                     # API endpoints for fetching data
    └── index.js             # Main API handler
```

## Exercise Format

Each exercise is documented in a markdown file following this structure:

```markdown
---
id: push-up
name: Push-up
category: upper-body
primaryMuscles: [chest, triceps, shoulders]
secondaryMuscles: [core, serratus-anterior]
equipment: [none]
difficulty: beginner
tags: [bodyweight, compound]
---

# Push-up

![Push-up demonstration](../assets/images/push-up.jpg)

## Description
A bodyweight exercise that primarily targets the chest, triceps, and shoulders.

## Instructions
1. Start in a plank position with hands slightly wider than shoulder-width
2. Lower your body by bending your elbows until your chest nearly touches the floor
3. Push back up to the starting position
4. Repeat for the desired number of repetitions

## Tips
- Keep your body in a straight line from head to heels
- Don't let your hips sag or pike up
- Fully extend your arms at the top of the movement

## Variations
- Knee push-ups (easier)
- Decline push-ups (harder)
- Diamond push-ups (more triceps focus)

## Video Tutorial
[Watch video tutorial](../assets/videos/push-up.mp4)
```

## Contributing

To add a new exercise:

1. Create a markdown file in the appropriate category folder
2. Follow the format outlined above
3. Include any necessary images or videos in the assets folder
4. Run validation scripts to ensure consistency

## Usage in Applications

The data in this repository can be consumed by applications in multiple ways:

1. **Direct markdown consumption**: Applications that can parse markdown
2. **JSON API**: Use the provided API endpoints to fetch exercise data
3. **Build-time conversion**: Convert to JSON during your app's build process

For integration documentation, see the [API documentation](./api/README.md).