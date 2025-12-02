# TruthSeeker Prototype

TruthSeeker is a Vite + React single-page mystery game that assembles interactive cases from structured story data. Players review initial clues, unlock additional evidence with action points, answer quiz questions, and finally reveal the full solution. The current build features a replayable “Museum Kidnapping” story with randomized suspects, evidence, and timeline details.

## Features
- Story-driven data model (`public/pools.json`) supporting multiple authored stories
- Randomized variables (suspects, locations, clues) for each new case
- Difficulty system that controls how many clues/quiz questions are shown:
  | Difficulty | Initial Clues | Quiz Questions |
  |------------|----------------|----------------|
  | Easy       | 100%           | 30%            |
  | Medium     | 60%            | 60%            |
  | Hard       | 30%            | 100%           |
- Action-point store (10/20/30/40 AP per purchase, with refunds based on quiz score)
- Responsive UI with home screen, suspect grid, clue store, quiz, and stylized solution reveal

## Getting Started
```bash
# install dependencies
npm install

# run the dev server
npm run dev
# open http://localhost:5173
```

### Building for Production
```bash
npm run build
npm run preview   # optional local preview of dist/
```

## Project Structure
```
truth-seeker-proto/
  public/
    pools.json        # stories + clues + quizzes
    assets/           # static images (e.g. museum_map.png)
  src/
    app/              # Home screen + main game page
    components/       # UI components (store, quiz, solution, etc.)
    engines/          # Data assembly and game logic helpers
    hooks/            # useCaseEngine + useQuiz state hooks
    services/         # loaders (fetch pools.json)
    utils/            # template helpers, RNG, etc.
    styles.css        # global styling
```

## Gameplay Flow
1. **Home Screen** – choose difficulty or resume the current case.
2. **Case Generation** – `caseGenerator.js` loads a story, randomizes variables, and prepares initial/store clues + quiz questions.
3. **During Play**
   - Review initial clues (includes micro-events and unused store clues).
   - Spend action points to unlock one clue per category (Background, Timeline, Physical, Testimonial).
   - Answer quiz questions and reveal results to receive an AP refund based on accuracy.
4. **Solution Reveal** – view the summary and supporting evidence once ready.
5. **Progression** – `New Case` re-runs the current story with new random variables; `Next Story` advances to the next story index; `Home` returns to the difficulty selector.

## Authoring New Stories
Stories live inside `public/pools.json` under the `stories` array. Each story contains:
- `variables`: interchangeable values for suspects, rooms, blankets, time windows, etc. (arrays = random options).
- `templates`: description beats, clues (initial + store), micro-events, quiz questions, solution text.
- `metadata`: optional `blurb`, `map`, and UI settings.

To add a story:
1. Append a new story object (`id`, `title`, `tags`).
2. Define suspects (A–D), support actors, locations, blankets, and time window variants.
3. Write description beats and clues, using `${variable.path}` placeholders.
4. Provide store clues for each of the four categories; extras will be folded into initial clues.
5. Add quiz questions and a solution summary/bullet details.
6. Optional: include `metadata.map` pointing to an image in `public/assets/`.
7. Run `npm run dev` and use the home screen to test the new story via `Next Story`.

Details, examples, and authoring guidelines are available in **TruthSeeker_Documentation.md**.

## Contributing / Extending
- The codebase currently targets English only. If localization is needed, reintroduce logic in `src/utils/i18n.js`.
- Contradiction detection and suspect filtering are stubbed; extend `engines/contradictionEngine.js` and `engines/clueFilters.js` as needed.
- Feel free to expand UI components or styling. `styles.css` contains base styles and component-specific classes.

## License
This project is a prototype and not yet licensed for release. Contact the maintainers before redistribution or commercial use.
