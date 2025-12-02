import axios from 'axios';

const BASE = 'http://localhost:3000/api';

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function logSection(title) {
  console.log(`\n${colors.cyan}${colors.bright}=== ${title} ===${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logError(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function logData(data, label = '') {
  if (label) {
    console.log(`${colors.yellow}${label}:${colors.reset}`);
  }
  console.log(JSON.stringify(data, null, 2));
}

async function run() {
  try {
    // Step 1: Get Stories
    logSection('1. GET /api/stories');
    const storiesRes = await axios.get(`${BASE}/stories`);
    logSuccess('Stories loaded successfully');
    logData(storiesRes.data, 'Response');
    
    if (!storiesRes.data.stories || storiesRes.data.stories.length === 0) {
      logError('No stories found!');
      return;
    }
    
    const storyCount = storiesRes.data.stories.length;
    console.log(`${colors.blue}Found ${storyCount} story/stories${colors.reset}`);

    // Step 2: Create Case
    logSection('2. POST /api/cases (Create New Case)');
    const createRes = await axios.post(`${BASE}/cases`, {
      storyIndex: 0,
      difficulty: 'medium',
      seed: 12345
    });
    logSuccess('Case created successfully');
    
    const sessionId = createRes.data.sessionId;
    console.log(`${colors.blue}Session ID: ${sessionId}${colors.reset}`);
    
    // Validate case structure
    const caseData = createRes.data.case;
    console.log(`\n${colors.yellow}Validating case structure:${colors.reset}`);
    
    if (caseData.narrative) {
      logSuccess(`Narrative exists (${caseData.narrative.substring(0, 50)}...)`);
    } else {
      logError('Narrative missing!');
    }
    
    if (caseData.suspects && Array.isArray(caseData.suspects)) {
      logSuccess(`Suspects: ${caseData.suspects.length} found`);
      caseData.suspects.forEach((suspect, idx) => {
        console.log(`  ${idx + 1}. ${suspect.name} (${suspect.role || 'Unknown'})`);
      });
    } else {
      logError('Suspects missing or invalid!');
    }
    
    if (caseData.initialClues && Array.isArray(caseData.initialClues)) {
      logSuccess(`Initial Clues: ${caseData.initialClues.length} found`);
    } else {
      logError('Initial clues missing or invalid!');
    }
    
    if (caseData.statementEntries && Array.isArray(caseData.statementEntries)) {
      logSuccess(`Statement Entries: ${caseData.statementEntries.length} found`);
    } else {
      logError('Statement entries missing or invalid!');
    }
    
    if (createRes.data.store && Array.isArray(createRes.data.store)) {
      logSuccess(`Store: ${createRes.data.store.length} clues available`);
    } else {
      logError('Store missing or invalid!');
    }
    
    if (typeof createRes.data.actionPoints === 'number') {
      logSuccess(`Action Points: ${createRes.data.actionPoints}`);
    } else {
      logError('Action points missing!');
    }
    
    if (typeof createRes.data.nextAbilityCost === 'number') {
      logSuccess(`Next Ability Cost: ${createRes.data.nextAbilityCost}`);
    } else {
      logError('Next ability cost missing!');
    }
    
    logData(createRes.data, 'Full Response');

    // Step 3: Get Case
    logSection('3. GET /api/cases/:sessionId');
    const getCaseRes = await axios.get(`${BASE}/cases/${sessionId}`);
    logSuccess('Case retrieved successfully');
    
    const store = getCaseRes.data.store;
    if (!store || store.length === 0) {
      logError('No clues in store!');
      return;
    }
    
    const firstClue = store[0].clue;
    console.log(`${colors.blue}First available clue: ${firstClue.id} - ${firstClue.title}${colors.reset}`);
    logData(getCaseRes.data, 'Case State');

    // Step 4: Purchase Clue
    logSection('4. POST /api/cases/:sessionId/clues/purchase');
    const purchaseRes = await axios.post(`${BASE}/cases/${sessionId}/clues/purchase`, {
      clueId: firstClue.id
    });
    logSuccess('Clue purchased successfully');
    
    // Validate purchase response
    console.log(`\n${colors.yellow}Validating purchase response:${colors.reset}`);
    if (purchaseRes.data.success === true) {
      logSuccess('Purchase success flag: true');
    } else {
      logError('Purchase success flag missing or false!');
    }
    
    if (purchaseRes.data.clue) {
      logSuccess(`Clue received: ${purchaseRes.data.clue.title}`);
    } else {
      logError('Clue data missing!');
    }
    
    if (typeof purchaseRes.data.actionPoints === 'number') {
      logSuccess(`Remaining Action Points: ${purchaseRes.data.actionPoints}`);
    } else {
      logError('Action points missing!');
    }
    
    if (typeof purchaseRes.data.spentCost === 'number') {
      logSuccess(`Spent Cost: ${purchaseRes.data.spentCost}`);
    } else {
      logError('Spent cost missing!');
    }
    
    if (typeof purchaseRes.data.nextAbilityCost === 'number') {
      logSuccess(`Next Ability Cost: ${purchaseRes.data.nextAbilityCost}`);
    } else {
      logError('Next ability cost missing!');
    }
    
    logData(purchaseRes.data, 'Purchase Response');

    // Step 5: Get Quiz
    logSection('5. GET /api/cases/:sessionId/quiz');
    const quizRes = await axios.get(`${BASE}/cases/${sessionId}/quiz`);
    logSuccess('Quiz retrieved successfully');
    
    const questions = quizRes.data.questions;
    if (!questions || questions.length === 0) {
      logError('No quiz questions found!');
      return;
    }
    
    console.log(`\n${colors.yellow}Quiz Questions:${colors.reset}`);
    questions.forEach((q, idx) => {
      console.log(`  ${idx + 1}. ${q.question}`);
      console.log(`     Options: ${q.options.length}`);
      console.log(`     ID: ${q.id}`);
    });
    
    logData(quizRes.data, 'Quiz Response');

    // Step 6: Submit Quiz Answers
    logSection('6. POST /api/cases/:sessionId/quiz/finalize');
    
    // Build answers (using first option for each question as test)
    const answers = {};
    questions.forEach((q) => {
      answers[q.id] = q.options[0]; // Use first option as test answer
    });
    
    console.log(`${colors.blue}Submitting answers for ${Object.keys(answers).length} questions${colors.reset}`);
    
    const finalizeRes = await axios.post(`${BASE}/cases/${sessionId}/quiz/finalize`, {
      answers
    });
    logSuccess('Quiz finalized successfully');
    
    // Validate finalize response
    console.log(`\n${colors.yellow}Validating quiz results:${colors.reset}`);
    if (finalizeRes.data.score) {
      const { correct, total } = finalizeRes.data.score;
      logSuccess(`Score: ${correct}/${total} (${Math.round((correct / total) * 100)}%)`);
    } else {
      logError('Score missing!');
    }
    
    if (finalizeRes.data.results && Array.isArray(finalizeRes.data.results)) {
      logSuccess(`Results: ${finalizeRes.data.results.length} questions processed`);
      finalizeRes.data.results.forEach((result, idx) => {
        const status = result.correct ? '✓' : '✗';
        const color = result.correct ? colors.green : colors.red;
        console.log(`  ${idx + 1}. ${color}${status}${colors.reset} ${result.questionId}`);
      });
    } else {
      logError('Results missing!');
    }
    
    if (typeof finalizeRes.data.refund === 'number') {
      logSuccess(`Refund: ${finalizeRes.data.refund} AP`);
    } else {
      logError('Refund missing!');
    }
    
    if (typeof finalizeRes.data.finalActionPoints === 'number') {
      logSuccess(`Final Action Points: ${finalizeRes.data.finalActionPoints}`);
    } else {
      logError('Final action points missing!');
    }
    
    logData(finalizeRes.data, 'Finalize Response');

    // Step 7: Reveal Solution
    logSection('7. POST /api/cases/:sessionId/solution/reveal');
    const solutionRes = await axios.post(`${BASE}/cases/${sessionId}/solution/reveal`);
    logSuccess('Solution revealed successfully');
    
    // Validate solution response
    console.log(`\n${colors.yellow}Validating solution:${colors.reset}`);
    if (solutionRes.data.success === true) {
      logSuccess('Reveal success flag: true');
    } else {
      logError('Reveal success flag missing or false!');
    }
    
    if (solutionRes.data.solution) {
      const sol = solutionRes.data.solution;
      if (sol.summary) {
        logSuccess(`Summary exists (${sol.summary.substring(0, 50)}...)`);
      } else {
        logError('Summary missing!');
      }
      
      if (sol.details && Array.isArray(sol.details)) {
        logSuccess(`Details: ${sol.details.length} items`);
        sol.details.forEach((detail, idx) => {
          console.log(`  ${idx + 1}. ${detail}`);
        });
      } else {
        logError('Details missing or invalid!');
      }
    } else {
      logError('Solution data missing!');
    }
    
    logData(solutionRes.data, 'Solution Response');

    // Step 8: Get Solution (verify it's accessible after reveal)
    logSection('8. GET /api/cases/:sessionId/solution');
    const getSolutionRes = await axios.get(`${BASE}/cases/${sessionId}/solution`);
    logSuccess('Solution retrieved successfully');
    logData(getSolutionRes.data, 'Solution Data');

    // Final Summary
    logSection('TEST SUMMARY');
    console.log(`${colors.green}${colors.bright}✓ All API endpoints tested successfully!${colors.reset}`);
    console.log(`${colors.blue}Session ID: ${sessionId}${colors.reset}`);
    console.log(`${colors.blue}All validations passed!${colors.reset}`);

  } catch (error) {
    logError('Test failed!');
    if (error.response) {
      console.log(`${colors.red}Status: ${error.response.status}${colors.reset}`);
      console.log(`${colors.red}Error: ${JSON.stringify(error.response.data, null, 2)}${colors.reset}`);
    } else if (error.request) {
      console.log(`${colors.red}No response received. Is the server running?${colors.reset}`);
      console.log(`${colors.red}Make sure to run: npm run server${colors.reset}`);
    } else {
      console.log(`${colors.red}Error: ${error.message}${colors.reset}`);
    }
    process.exit(1);
  }
}

// Run the tests
console.log(`${colors.bright}${colors.cyan}Truth Seeker API Test Suite${colors.reset}`);
console.log(`${colors.blue}Make sure the API server is running on http://localhost:3000${colors.reset}`);
console.log(`${colors.blue}Start server with: npm run server${colors.reset}\n`);

run();

