# Truth Seeker - Detective Game

A Unity-based detective game where players investigate mysteries and uncover the truth.

## About

Truth Seeker is an interactive detective game available in two versions:
- **Unity Desktop Version**: A Windows desktop application built with Unity
- **Web-Based Prototype**: A browser-based version built with Vite + React (v0.1.0)

Players take on the role of a detective, solving cases through investigation, puzzle-solving, and deduction.

## System Requirements

- **OS**: Windows 10 or later
- **Architecture**: x64 (64-bit)
- **Additional**: DirectX compatible graphics card

## Installation

1. Download or clone this repository
2. Navigate to the project directory
3. Run `truth_seeker.exe` to launch the game

## How to Play

Simply double-click `truth_seeker.exe` to start the game. The game will launch in a new window.

## Project Structure

This repository contains two versions of Truth Seeker:

### Unity Desktop Version
- `truth_seeker.exe` - Main game executable
- `truth_seeker_Data/` - Game assets and resources
- `MonoBleedingEdge/` - Mono runtime files
- `UnityPlayer.dll` - Unity player library
- `UnityCrashHandler64.exe` - Unity crash handler

### Web-Based Prototype (v0.1.0)
Located in `TruthSeeker_Prototype/truth-seeker-proto/`, this is a Vite + React single-page application featuring:

- **Technology Stack**: Vite, React 18, React Query
- **Story-Driven Gameplay**: Procedurally generates cases from structured JSON stories
- **Difficulty System**: Three difficulty levels (Easy, Medium, Hard) affecting clue availability and quiz questions
- **Action Point System**: Spend AP to unlock clues, with refunds based on quiz performance
- **Replayability**: Randomized suspects, locations, and evidence for each playthrough

#### Web Version Features
- **Difficulty Levels**:
  | Difficulty | Initial Clues | Quiz Questions |
  |------------|---------------|----------------|
  | Easy       | 100%          | 30%            |
  | Medium     | 60%           | 60%            |
  | Hard       | 30%           | 100%           |

- **Gameplay Flow**:
  1. Select difficulty level
  2. Review initial clues and micro-events
  3. Spend action points (10/20/30/40 AP) to unlock additional evidence from four categories:
     - Background
     - Timeline
     - Physical Evidence
     - Testimonial
  4. Answer quiz questions to test your deduction
  5. Reveal the solution with supporting evidence

- **Current Story**: "Museum Kidnapping" (with support for multiple stories)

#### Running the Web Version

```bash
# Navigate to the web prototype directory
cd TruthSeeker_Prototype/truth-seeker-proto

# Install dependencies
npm install

# Start development server
npm run dev
# Open http://localhost:5173 in your browser

# Build for production
npm run build

# Preview production build
npm run preview
```

For detailed documentation about the web version, see `TruthSeeker_Prototype/TruthSeeker_Documentation.md`.

## Notes

### Unity Version
- This is a built Unity game, not the source project
- For development or modifications, you would need the Unity project source files
- The game uses Unity's Burst compiler (indicated by Burst debug information)

### Web Version
- The web prototype is story-agnostic and can load multiple authored stories from `public/pools.json`
- Stories can be authored by editing the JSON structure (see documentation for details)
- The engine supports template-based story generation with randomized variables

## Troubleshooting

If you encounter issues:

1. Ensure you're running on a 64-bit Windows system
2. Make sure all files in the repository are present
3. Check that your graphics drivers are up to date
4. Run as administrator if you encounter permission issues

## Credits

Jingyao Yu

## License



---

## Version Information

- **Unity Desktop Version**: Windows build (x64)
- **Web-Based Prototype**: v0.1.0 (Vite + React)

**Note**: The Unity version is a Windows build. For other platforms, you would need to build from the Unity source project. The web version runs in any modern web browser.

