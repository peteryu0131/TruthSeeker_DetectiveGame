import { useCallback, useEffect, useMemo, useState } from 'react';
import { generateCase } from '../engines/caseGenerator.js';
import { buildStatement, mergePurchasedClue } from '../engines/statementEngine.js';
import { composeSolution } from '../engines/solutionComposer.js';

const DEFAULT_DIFFICULTY = 'medium';
const BASE_ACTION_POINTS = 100;
const ACTION_POINT_STEP = 10;
