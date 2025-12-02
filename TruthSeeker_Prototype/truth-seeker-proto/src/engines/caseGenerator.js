import { createSeededRandom } from '../services/rng.js';
import { renderTemplate } from '../utils/template.js';

// Four core evidence categories
export const CORE_CATEGORIES = ['background', 'timeline', 'physical', 'testimonial'];
// Other category identifier
export const OTHER_CATEGORY = 'other';
// All supported store categories (four core + other)
export const STORE_CATEGORIES = [...CORE_CATEGORIES, OTHER_CATEGORY];

const DIFFICULTY_CONFIG = {
  easy: { clueMultiplier: 1, quizRatio: 0.3 },
  medium: { clueMultiplier: 0.6, quizRatio: 0.6 },
  hard: { clueMultiplier: 0.3, quizRatio: 1.0 }
};

export function generateCase(stories = [], storyIndex = 0, difficulty = 'medium', seed) {
  const story = stories[storyIndex];
  if (!story) {
    throw new Error(`Story not found for index ${storyIndex}`);
  }

  const difficultySettings = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.medium;

  // Generate a more random seed if not provided
  // Use Date.now() + Math.random() to ensure better distribution even with rapid clicks
  const effectiveSeed = typeof seed === 'number' 
    ? seed 
    : Date.now() + Math.floor(Math.random() * 1000000);
  const rng = createSeededRandom(effectiveSeed);
  const context = buildContext(story.variables ?? {}, rng);

  const descriptionBeats = renderTemplateList(story.templates?.descriptionBeats ?? [], context);
  const microEvents = renderMicroEvents(story.templates?.microEvents ?? {}, context);
  const renderedInitialClues = renderTemplateList(story.templates?.initialClues ?? [], context);
  const { initialFromStore, storeClues, overflowClues } = renderStoreClues(
    story.templates?.storeClues ?? [],
    context,
    rng
  );
  const microEventClues = microEvents.map((event) => ({
    id: event.id,
    title: event.title ?? 'Micro Event',
    text: event.text,
    tags: event.tags ?? [],
    phase: event.phase
  }));
  const allInitialClues = [...renderedInitialClues, ...initialFromStore, ...overflowClues, ...microEventClues];
  const initialClues = selectCluesByMultiplier(allInitialClues, difficultySettings.clueMultiplier, rng);
  const statementEntries = renderTemplateList(story.templates?.statementEntries ?? [], context);
  const quizQuestions = renderQuizQuestions(
    story.templates?.quizQuestions ?? [],
    difficultySettings.quizRatio,
    rng,
    context
  );
  const solution = renderSolution(story.templates?.solution ?? {}, context);

  const suspects = extractSuspects(context.suspects ?? {});

  return {
    seed: effectiveSeed,
    storyId: story.id,
    storyTitle: story.title,
    tags: story.tags ?? [],
    metadata: story.metadata ?? {},
    storyIndex,
    totalStories: stories.length,
    difficulty,
    context,
    narrative: descriptionBeats.map((beat) => beat.text).join(' '),
    descriptionBeats,
    microEvents,
    victim: context.victim ?? null,
    location: context.locationMain ?? null,
    timeWindow: context.timeWindow ?? null,
    suspects,
    initialClues,
    storeClues,
    statementEntries,
    quiz: quizQuestions,
    solution
  };
}

function buildContext(variables, rng) {
  const context = {};
  for (const [key, value] of Object.entries(variables)) {
    if (Array.isArray(value)) {
      context[key] = pickVariant(value, rng);
    } else if (value && typeof value === 'object') {
      const nested = {};
      for (const [innerKey, innerValue] of Object.entries(value)) {
        if (Array.isArray(innerValue)) {
          nested[innerKey] = pickVariant(innerValue, rng);
        } else if (innerValue && typeof innerValue === 'object') {
          nested[innerKey] = buildContext(innerValue, rng);
        } else {
          nested[innerKey] = innerValue;
        }
      }
      context[key] = nested;
    } else {
      context[key] = value;
    }
  }
  return context;
}

function pickVariant(list, rng) {
  if (!list.length) return null;
  const index = Math.floor(rng() * list.length);
  const variant = list[index];
  if (variant && typeof variant === 'object' && !Array.isArray(variant)) {
    return { ...variant };
  }
  return variant;
}

function shuffle(array, rng) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function renderTemplateList(list, context) {
  return list.map((item) => ({
    ...item,
    text: renderTemplate(item.text, context)
  }));
}

function renderMicroEvents(microEvents, context) {
  return Object.entries(microEvents).flatMap(([phase, events]) =>
    (events ?? []).map((event) => ({
      ...event,
      phase,
      text: renderTemplate(event.text, context)
    }))
  );
}

function renderStoreClues(entries, context, rng) {
  const initialFromStore = [];
  const store = [];
  const overflow = [];
  const groupedByCategory = new Map();

  entries.forEach((entry) => {
    const renderedClue = {
      ...entry.clue,
      text: renderTemplate(entry.clue.text, context)
    };

    const shouldStartUnlocked = entry.initial === true || entry.clue?.initial === true;

    if (shouldStartUnlocked) {
      initialFromStore.push(renderedClue);
      return;
    }

    const normalizedCategory = (entry.category ?? '').toLowerCase();
    // If category is empty or not in core categories, classify as "other"
    const finalCategory = normalizedCategory && CORE_CATEGORIES.includes(normalizedCategory)
      ? normalizedCategory
      : OTHER_CATEGORY;

    if (!groupedByCategory.has(finalCategory)) {
      groupedByCategory.set(finalCategory, []);
    }
    groupedByCategory.get(finalCategory).push(renderedClue);
  });

  groupedByCategory.forEach((clues, categoryKey) => {
    const shuffled = shuffle(clues, rng);
    const selected = shuffled[0];
    const extra = shuffled.slice(1);
    if (selected) {
      const displayCategory = capitalizeCategory(categoryKey);
      store.push({
        category: displayCategory,
        clue: selected
      });
    }
    overflow.push(...extra);
  });

  return { initialFromStore, storeClues: store, overflowClues: overflow };
}

function capitalizeCategory(category) {
  if (!category) return category;
  // Special handling for "other" category, display as "OTHER"
  if (category.toLowerCase() === OTHER_CATEGORY) {
    return 'OTHER';
  }
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function renderQuizQuestions(questions, quizRatio, rng, context) {
  if (!questions.length) return [];
  
  // Separate the "who is the culprit" questions (with quiz:final tag)
  const finalQuestions = questions.filter((q) => 
    (q.tags ?? []).includes('quiz:final')
  );
  const otherQuestions = questions.filter((q) => 
    !(q.tags ?? []).includes('quiz:final')
  );
  
  let selectedOtherQuestions;
  if (quizRatio >= 1) {
    selectedOtherQuestions = otherQuestions;
  } else {
    const count = Math.max(1, Math.round(otherQuestions.length * quizRatio));
    selectedOtherQuestions = shuffle(otherQuestions, rng).slice(0, count);
  }
  
  // Render other questions
  const renderedOther = selectedOtherQuestions.map((question) => 
    renderQuizQuestion(question, context)
  );
  
  // Render "who is the culprit" questions and place them at the end
  const renderedFinal = finalQuestions.map((question) => 
    renderQuizQuestion(question, context)
  );
  
  return [...renderedOther, ...renderedFinal];
}

function renderQuizQuestion(question, context) {
  return {
    ...question,
    question: renderTemplate(question.question, context),
    options: (question.options ?? []).map((option) => renderTemplate(option, context)),
    answer: renderTemplate(question.answer, context)
  };
}

function renderSolution(solution, context) {
  return {
    summary: renderTemplate(solution.summary ?? '', context),
    details: (solution.details ?? []).map((detail) => renderTemplate(detail, context)),
    tags: solution.tags ?? []
  };
}

function extractSuspects(suspectsMap) {
  return Object.entries(suspectsMap).map(([id, suspect]) => ({
    id,
    ...suspect
  }));
}

function selectCluesByMultiplier(clues, multiplier, rng) {
  if (multiplier >= 1 || clues.length <= 1) {
    return clues;
  }
  const count = Math.max(1, Math.round(clues.length * multiplier));
  if (count >= clues.length) {
    return clues;
  }
  return shuffle(clues, rng).slice(0, count);
}
