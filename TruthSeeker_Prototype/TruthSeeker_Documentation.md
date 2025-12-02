# TruthSeeker Prototype Documentation (2025-11)

## Overview
TruthSeeker is a single-page investigative game built with Vite + React. It procedurally assembles murder/kidnapping style cases from structured JSON stories, letting the player review initial clues, unlock additional evidence via an action-point store, and answer quiz questions before revealing the full solution. The current build includes a single story (`Museum Kidnapping`), but the engine is story-agnostic and can load any number of authored stories.

Key features:
- Story-driven data pulled from `public/pools.json`
- Randomized variables (suspects, locations, blankets, etc.) for replayable cases
- Difficulty-specific filtering of clues and quiz questions
- Action-point flow with escalating costs (10/20/30/40)
- React UI with a home screen, suspect cards, clue store, quiz panel, and stylized solution reveal

## Project Structure
```
truth-seeker-proto/
  public/
    pools.json             # Story data (array of stories)
    assets/museum_map.png  # Sample map used in the first story
  src/
    app/
      HomeScreen.jsx       # Difficulty selection screen
      TruthSeekerPage.jsx  # Main game view (switches between home + game)
    components/
      ... (UI components for clues, store, quiz, solution, etc.)
    engines/
      caseGenerator.js     # Builds case data from stories
      quizEngine.js        # Picks quiz questions based on difficulty ratio
      statementEngine.js   # Assembles statement panel content
      ... (other logical helpers)
    hooks/
      useCaseEngine.js     # Core game state hook
      useQuiz.js           # Quiz state hook
    services/
      pools.js             # Loads `/pools.json`
    styles.css             # Global styling
```

## Gameplay Flow
1. **Home Screen** (`HomeScreen.jsx`)
   - Player selects `easy`, `medium`, or `hard`. `useCaseEngine` resets with the chosen difficulty.
   - Home screen can also resume an in-progress case.

2. **Case Generation** (`caseGenerator.js`)
   - Chooses a story by index (defaults to 0). Randomizes variables (suspects, blankets, rooms, etc.).
   - Renders description beats, micro-events, lines from initial clues and store pools.
   - Selects store clues randomly: one per `Background/Timeline/Physical/Testimonial`. Extras become initial clues.
   - Filters initial clues and quiz questions based on difficulty (clue multiplier + quiz ratio).

3. **In-Game Actions**
   - **Initial Clues**: Always visible `initialClues` list (includes micro-events and unused store clues).
   - **Clue Store**: Four slots, cost increases per purchase (10/20/30/40 AP). Purchasing reveals full text.
   - **Quiz Panel**: Subset of questions depending on difficulty ratio. Player answers and reveals results.
   - **Solution Panel**: Initially locked; reveals summary and bullet points once requested.

4. **Action Points**
   - Start at 100 AP. Each store purchase deducts `(purchased + 1) * 10`.
   - After revealing quiz results, AP refund = `spent * correctness ratio` (rounded).

5. **Story Progression**
   - `Next Story` button cycles through stories sequentially (wraps around).
   - `New Case` reruns current story index with fresh random variables.
   - `Home` returns to difficulty selection (current case can be resumed).

## Difficulty Settings
Defined in `caseGenerator.js`:
| Difficulty | Initial Clue Multiplier | Quiz Ratio |
|------------|------------------------|------------|
| easy       | 1.0 (all clues)        | 0.3        |
| medium     | 0.6                    | 0.6        |
| hard       | 0.3                    | 1.0        |

The multiplier randomly samples that fraction of initial clues (minimum 1). Quiz ratio controls how many questions are selected (rounds to at least 1). Store clues always offer one per category regardless of difficulty.

## Story Authoring Guide (`public/pools.json`)
A story entry has three major sections:
- `variables`: collections of interchangeable values (arrays) for suspects, rooms, blankets, time windows, etc. Add more variants to increase randomness. Fields use camelCase keys (e.g., `locationMain`, `roomEntrance`).
- `templates`: textual templates referencing `${variable.path}`. Include:
  - `descriptionBeats`
  - `microEvents` (converted into initial clues automatically)
  - `initialClues` (with `category` + optional `difficulty`)
  - `storeClues` (objects with `category`, `clue.id/title/text/difficulty` and optional `initial` flag)
  - `statementEntries` (currently unused for opening narrative)
  - `quizQuestions` (question/options/answer + optional difficulty tags)
  - `solution` (summary + bullet `details`)
- `metadata`: optional text shown in UI (`blurb`, `map` image path, etc.).

### Template Rules
- Use `${...}` placeholders. They can reference nested objects: `${suspects.A.name}`, `${roomStorage.label}`, `${timeWindow.start}`.
- Keep categories in `storeClues` as `Background`, `Timeline`, `Physical`, `Testimonial` (case-insensitive when stored).
- For varied clues, supply multiple entries per category; the engine shuffles and selects one per slot.

### Adding New Stories
1. Append a new object to `stories` array with a unique `id` (e.g., `story02_airport`).
2. Fill in `variables` with relevant data (at least suspects A–D, support/decoy, location/time).
3. Author `descriptionBeats`, clues, quizzes, and solution. Ensure placeholders match variable keys.
4. (Optional) Provide `metadata.map` for custom images (place under `public/assets`).
5. Verify by running `npm run dev`, selecting difficulty, and navigating to the story using `Next Story`.

## Extending the System
- **Multiple Endings / Contradictions**: `contradictionEngine.js` is currently unused. You can rewire it to add contradictions when certain clues are purchased.
- **Custom Actions**: Use `useCaseEngine` to introduce new mechanics (e.g., a hint system). Provide additional state and pass handlers to components.
- **Localization**: i18n layer is stubbed; reintroduce translation logic via `utils/i18n.js` if needed.
- **Build Deployment**: Standard Vite build. To ship, run `npm run build` and host the `dist/` folder.

## Development Setup
```bash
cd truth-seeker-proto
npm install
npm run dev    # visit http://localhost:5173
```

Useful scripts:
- `npm run dev` – dev server with hot reload
- `npm run build` – optimized production build
- `npm run preview` – serve build output locally

## File Naming & Git
- Primary data file is `public/pools.json` (renamed from `pools_en.json`).
- `.gitignore` excludes `node_modules/`, `dist/`, logs, and build artifacts.
- Source files use CamelCase for components, kebab-case for assets.

## Checklist When Adding New Story Content
1. Expand variable arrays for names/locations if you want extra randomness.
2. Write initial/store clues and ensure categories cover all four store slots.
3. Add quiz questions (10+ recommended) referencing the same variables.
4. Update `metadata` (title, blurb, map) to match the new story.
5. Optionally log story-specific instructions in this documentation.

## Known Gaps / Future Ideas
- Contradiction detection is inactive; re-enable when rules are authored.
- Candidate suspect narrowing (attr filters) is currently stubbed; integrate if needed.
- Autosave/continue state could be persisted to local storage.
- Additional UI polish for mobile responsiveness.

---
This document reflects the codebase as of November 2025. Keep it updated whenever gameplay or data format changes so story authors and developers can stay in sync.
