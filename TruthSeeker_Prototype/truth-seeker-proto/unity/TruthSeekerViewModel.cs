using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.Networking;

// ============================================================================
// Data Models (corresponds to backend JSON structure)
// ============================================================================

[Serializable]
public class CaseResponse
{
    public string sessionId;
    public CaseData @case;
    public StoreEntry[] store;
    public int actionPoints;
    public int nextAbilityCost;
}

[Serializable]
public class CaseData
{
    public int seed;
    public string storyId;
    public string storyTitle;
    public string difficulty;
    public string narrative;
    public Victim victim;
    public Location location;
    public TimeWindow timeWindow;
    public Suspect[] suspects;
    public Clue[] initialClues;
    public StatementEntry[] statementEntries;
}

[Serializable]
public class Victim
{
    public string id;
    public string name;
    public string role;
}

[Serializable]
public class Location
{
    public string id;
    public string label;
}

[Serializable]
public class TimeWindow
{
    public string id;
    public string start;
    public string end;
}

[Serializable]
    public class Suspect
    {
        public string id;
        public string name;
        public string gender;
        public string occupation;
        public string appearance;
        public string clothing;
        public string role;
    }

[Serializable]
public class Clue
{
    public string id;
    public string title;
    public string text;
    public string category;
    public int difficulty;
    public string[] tags;
}

[Serializable]
public class StatementEntry
{
    public string id;
    public string title;
    public string text;
    public string origin;
    public string[] tags;
}

[Serializable]
public class CaseStateResponse
{
    public CaseData @case;
    public StoreEntry[] store;
    public Clue[] purchasedClues;
    public int actionPoints;
    public int nextAbilityCost;
    public StatementData statement;
}

[Serializable]
public class StatementData
{
    public StatementEntry[] initial;
    public StatementEntry[] purchased;
}

[Serializable]
public class StoreEntry
{
    public string category;
    public Clue clue;
    public bool purchased;
}

[Serializable]
public class PurchaseResponse
{
    public bool success;
    public Clue clue;
    public int actionPoints;
    public int nextAbilityCost;
    public int spentCost;
}

[Serializable]
public class QuizQuestion
{
    public string id;
    public string question;
    public string[] options;
    public int difficulty;
}

[Serializable]
public class QuizResponse
{
    public QuizQuestion[] questions;
}

[Serializable]
public class QuizFinalizeResponse
{
    public ScoreData score;
    public QuizResult[] results;
    public int refund;
    public int finalActionPoints;
    public int roundSpentPoints;
}

[Serializable]
public class ScoreData
{
    public int correct;
    public int total;
}

[Serializable]
public class QuizResult
{
    public string questionId;
    public bool correct;
    public string userAnswer;
    public string correctAnswer;
}

[Serializable]
public class SolutionResponse
{
    public bool success;
    public SolutionData solution;
}

[Serializable]
public class SolutionData
{
    public string summary;
    public string[] details;
}

// ============================================================================
// Cache Class
// ============================================================================

public class GameStateCache
{
    public string SessionId;
    public CaseResponse CurrentCase;
    public CaseStateResponse CurrentState;
    public List<QuizQuestion> QuizQuestions = new List<QuizQuestion>();
}

// ============================================================================
// Main ViewModel Class
// ============================================================================

public class TruthSeekerViewModel : MonoBehaviour
{
    [Header("API Configuration")]
    public string BaseUrl = "http://localhost:3000/api";

    public GameStateCache cache = new GameStateCache();

    // ============================================================================
    // I. Base: HTTP Request Wrapper
    // ============================================================================

    private IEnumerator SendGetRequest(string endpoint, Action<string> onSuccess, Action<string> onError)
    {
        string url = $"{BaseUrl}{endpoint}";
        using (UnityWebRequest request = UnityWebRequest.Get(url))
        {
            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                onSuccess?.Invoke(request.downloadHandler.text);
            }
            else
            {
                onError?.Invoke($"Error: {request.error} (Status: {request.responseCode})");
            }
        }
    }

    private IEnumerator SendPostRequest(string endpoint, string jsonData, Action<string> onSuccess, Action<string> onError)
    {
        string url = $"{BaseUrl}{endpoint}";
        using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
        {
            byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");

            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                onSuccess?.Invoke(request.downloadHandler.text);
            }
            else
            {
                string errorMessage = request.downloadHandler.text;
                try
                {
                    var errorObj = JsonUtility.FromJson<ErrorResponse>(errorMessage);
                    onError?.Invoke(errorObj.error ?? request.error);
                }
                catch
                {
                    onError?.Invoke(request.error);
                }
            }
        }
    }

    [Serializable]
    private class ErrorResponse
    {
        public string error;
        public string code;
    }

    // ============================================================================
    // II. Description (Case Description)
    // ============================================================================

    /// <summary>
    /// Get case description text from cache
    /// </summary>
    public string GetDescriptionText()
    {
        if (cache.CurrentCase?.@case?.narrative != null)
        {
            return cache.CurrentCase.@case.narrative;
        }
        return "No case loaded.";
    }

    /// <summary>
    /// Get case title
    /// </summary>
    public string GetCaseTitle()
    {
        return cache.CurrentCase?.@case?.storyTitle ?? "Unknown Case";
    }

    // ============================================================================
    // III. Suspect Info
    // ============================================================================

    /// <summary>
    /// Get all suspects list
    /// </summary>
    public List<Suspect> GetAllSuspects()
    {
        if (cache.CurrentCase?.@case?.suspects != null)
        {
            return cache.CurrentCase.@case.suspects.ToList();
        }
        return new List<Suspect>();
    }

    /// <summary>
    /// Get suspect by index
    /// </summary>
    public Suspect GetSuspectByIndex(int index)
    {
        var suspects = GetAllSuspects();
        if (index >= 0 && index < suspects.Count)
        {
            return suspects[index];
        }
        return null;
    }

    /// <summary>
    /// Get suspect by ID
    /// </summary>
    public Suspect GetSuspectById(string id)
    {
        return GetAllSuspects().FirstOrDefault(s => s.id == id);
    }

    /// <summary>
    /// Get suspect count
    /// </summary>
    public int GetSuspectCount()
    {
        return GetAllSuspects().Count;
    }

    // ============================================================================
    // IV. Statement (Initial Clues + Purchased Clues)
    // ============================================================================

    /// <summary>
    /// Get initial statements list
    /// </summary>
    public List<StatementEntry> GetInitialStatements()
    {
        if (cache.CurrentState?.statement?.initial != null)
        {
            return cache.CurrentState.statement.initial.ToList();
        }
        return new List<StatementEntry>();
    }

    /// <summary>
    /// Get purchased statements list
    /// </summary>
    public List<StatementEntry> GetPurchasedStatements()
    {
        if (cache.CurrentState?.statement?.purchased != null)
        {
            return cache.CurrentState.statement.purchased.ToList();
        }
        return new List<StatementEntry>();
    }

    /// <summary>
    /// Get all statements (initial + purchased)
    /// </summary>
    public List<StatementEntry> GetAllStatements()
    {
        var all = new List<StatementEntry>();
        all.AddRange(GetInitialStatements());
        all.AddRange(GetPurchasedStatements());
        return all;
    }

    // ============================================================================
    // V. Store (Purchasable Clues + Purchase Logic)
    // ============================================================================

    /// <summary>
    /// Get all store entries
    /// </summary>
    public List<StoreEntry> GetAllStoreEntries()
    {
        if (cache.CurrentState?.store != null)
        {
            return cache.CurrentState.store.ToList();
        }
        return new List<StoreEntry>();
    }

    /// <summary>
    /// Get store entries by category
    /// </summary>
    public List<StoreEntry> GetStoreEntriesByCategory(string category)
    {
        return GetAllStoreEntries()
            .Where(entry => entry.category.Equals(category, StringComparison.OrdinalIgnoreCase))
            .Where(entry => !entry.purchased)
            .ToList();
    }

    /// <summary>
    /// Get current action points
    /// </summary>
    public int GetActionPoints()
    {
        if (cache.CurrentState != null)
        {
            return cache.CurrentState.actionPoints;
        }
        return cache.CurrentCase?.actionPoints ?? 0;
    }

    /// <summary>
    /// Get next ability cost
    /// </summary>
    public int GetNextAbilityCost()
    {
        if (cache.CurrentState != null)
        {
            return cache.CurrentState.nextAbilityCost;
        }
        return cache.CurrentCase?.nextAbilityCost ?? 0;
    }

    /// <summary>
    /// Core purchase function
    /// </summary>
    public IEnumerator PurchaseClue(string clueId, Action<PurchaseResponse> onSuccess, Action<string> onError)
    {
        if (string.IsNullOrEmpty(cache.SessionId))
        {
            onError?.Invoke("No active session. Please create a case first.");
            yield break;
        }

        var request = new PurchaseClueRequest { clueId = clueId };
        string jsonData = JsonUtility.ToJson(request);
        string endpoint = $"/cases/{cache.SessionId}/clues/purchase";

        yield return SendPostRequest(endpoint, jsonData, (responseText) =>
        {
            try
            {
                PurchaseResponse purchaseResponse = JsonUtility.FromJson<PurchaseResponse>(responseText);
                
                // Update cache
                if (cache.CurrentState != null)
                {
                    cache.CurrentState.actionPoints = purchaseResponse.actionPoints;
                    cache.CurrentState.nextAbilityCost = purchaseResponse.nextAbilityCost;
                    
                    // Update purchased status of corresponding store entry
                    var storeEntry = cache.CurrentState.store.FirstOrDefault(e => e.clue != null && e.clue.id == clueId);
                    if (storeEntry != null)
                    {
                        storeEntry.purchased = true;
                    }
                }

                // Refresh state to get latest statement
                StartCoroutine(RefreshCaseState(() =>
                {
                    onSuccess?.Invoke(purchaseResponse);
                }, onError));
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to parse purchase response: {e.Message}");
            }
        }, onError);
    }

    [Serializable]
    private class PurchaseClueRequest
    {
        public string clueId;
    }

    /// <summary>
    /// Purchase Background category clue
    /// </summary>
    public IEnumerator PurchaseBackgroundClue(Action<PurchaseResponse> onSuccess, Action<string> onError)
    {
        var backgroundClues = GetStoreEntriesByCategory("Background");
        if (backgroundClues.Count == 0)
        {
            onError?.Invoke("No available Background clues.");
            yield break;
        }

        yield return PurchaseClue(backgroundClues[0].clue.id, onSuccess, onError);
    }

    /// <summary>
    /// Purchase Timeline category clue
    /// </summary>
    public IEnumerator PurchaseTimelineClue(Action<PurchaseResponse> onSuccess, Action<string> onError)
    {
        var timelineClues = GetStoreEntriesByCategory("Timeline");
        if (timelineClues.Count == 0)
        {
            onError?.Invoke("No available Timeline clues.");
            yield break;
        }

        yield return PurchaseClue(timelineClues[0].clue.id, onSuccess, onError);
    }

    /// <summary>
    /// Purchase Physical category clue
    /// </summary>
    public IEnumerator PurchasePhysicalClue(Action<PurchaseResponse> onSuccess, Action<string> onError)
    {
        var physicalClues = GetStoreEntriesByCategory("Physical");
        if (physicalClues.Count == 0)
        {
            onError?.Invoke("No available Physical clues.");
            yield break;
        }

        yield return PurchaseClue(physicalClues[0].clue.id, onSuccess, onError);
    }

    /// <summary>
    /// Purchase Testimonial category clue
    /// </summary>
    public IEnumerator PurchaseTestimonialClue(Action<PurchaseResponse> onSuccess, Action<string> onError)
    {
        var testimonialClues = GetStoreEntriesByCategory("Testimonial");
        if (testimonialClues.Count == 0)
        {
            onError?.Invoke("No available Testimonial clues.");
            yield break;
        }

        yield return PurchaseClue(testimonialClues[0].clue.id, onSuccess, onError);
    }

    // ============================================================================
    // VI. Quiz (Questions & Options + Scoring & Submission)
    // ============================================================================

    /// <summary>
    /// Load quiz questions
    /// </summary>
    public IEnumerator LoadQuizQuestions(Action<List<QuizQuestion>> onSuccess, Action<string> onError)
    {
        if (string.IsNullOrEmpty(cache.SessionId))
        {
            onError?.Invoke("No active session. Please create a case first.");
            yield break;
        }

        string endpoint = $"/cases/{cache.SessionId}/quiz";

        yield return SendGetRequest(endpoint, (responseText) =>
        {
            try
            {
                QuizResponse quizResponse = JsonUtility.FromJson<QuizResponse>(responseText);
                cache.QuizQuestions = quizResponse.questions.ToList();
                onSuccess?.Invoke(cache.QuizQuestions);
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to parse quiz response: {e.Message}");
            }
        }, onError);
    }

    /// <summary>
    /// Submit answers and get results
    /// </summary>
    public IEnumerator SubmitQuizAnswers(
        Dictionary<string, string> answers,
        Action<QuizFinalizeResponse> onSuccess,
        Action<string> onError
    )
    {
        if (string.IsNullOrEmpty(cache.SessionId))
        {
            onError?.Invoke("No active session. Please create a case first.");
            yield break;
        }

        // Unity JsonUtility doesn't support Dictionary, need to manually build JSON
        string jsonData = BuildAnswersJson(answers);
        string endpoint = $"/cases/{cache.SessionId}/quiz/finalize";

        yield return SendPostRequest(endpoint, jsonData, (responseText) =>
        {
            try
            {
                QuizFinalizeResponse finalizeResponse = JsonUtility.FromJson<QuizFinalizeResponse>(responseText);
                
                // Update action points in cache
                if (cache.CurrentState != null)
                {
                    cache.CurrentState.actionPoints = finalizeResponse.finalActionPoints;
                }

                onSuccess?.Invoke(finalizeResponse);
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to parse quiz finalize response: {e.Message}");
            }
        }, onError);
    }

    /// <summary>
    /// Manually build answers JSON (because Unity JsonUtility doesn't support Dictionary)
    /// </summary>
    private string BuildAnswersJson(Dictionary<string, string> answers)
    {
        System.Text.StringBuilder sb = new System.Text.StringBuilder();
        sb.Append("{\"answers\":{");
        
        bool first = true;
        foreach (var kvp in answers)
        {
            if (!first) sb.Append(",");
            sb.Append($"\"{kvp.Key}\":\"{kvp.Value}\"");
            first = false;
        }
        
        sb.Append("}}");
        return sb.ToString();
    }

    // ============================================================================
    // VII. Case Management
    // ============================================================================

    /// <summary>
    /// Create new case
    /// </summary>
    public IEnumerator CreateCase(int storyIndex, string difficulty, Action<CaseResponse> onSuccess, Action<string> onError, int? seed = null)
    {
        var requestData = new CreateCaseRequest
        {
            storyIndex = storyIndex,
            difficulty = difficulty
        };

        if (seed.HasValue)
        {
            // Note: Unity's JsonUtility doesn't support optional fields, need manual handling
            // Simplified here, if seed is not needed, don't pass it
        }

        string jsonData = JsonUtility.ToJson(requestData);
        string endpoint = "/cases";

        yield return SendPostRequest(endpoint, jsonData, (responseText) =>
        {
            try
            {
                CaseResponse caseResponse = JsonUtility.FromJson<CaseResponse>(responseText);
                
                // Update cache
                cache.SessionId = caseResponse.sessionId;
                cache.CurrentCase = caseResponse;
                
                // Immediately get full state
                StartCoroutine(RefreshCaseState(() =>
                {
                    onSuccess?.Invoke(caseResponse);
                }, onError));
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to parse case response: {e.Message}");
            }
        }, onError);
    }

    [Serializable]
    private class CreateCaseRequest
    {
        public int storyIndex;
        public string difficulty;
        public int seed; // Unity JsonUtility limitation, need special handling for optional fields
    }

    /// <summary>
    /// Refresh case state
    /// </summary>
    public IEnumerator RefreshCaseState(Action onSuccess = null, Action<string> onError = null)
    {
        if (string.IsNullOrEmpty(cache.SessionId))
        {
            onError?.Invoke("No active session.");
            yield break;
        }

        string endpoint = $"/cases/{cache.SessionId}";

        yield return SendGetRequest(endpoint, (responseText) =>
        {
            try
            {
                CaseStateResponse stateResponse = JsonUtility.FromJson<CaseStateResponse>(responseText);
                cache.CurrentState = stateResponse;
                onSuccess?.Invoke();
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to parse state response: {e.Message}");
            }
        }, onError);
    }

    /// <summary>
    /// Reset current case
    /// </summary>
    public IEnumerator ResetCase(string difficulty = null, Action<CaseResponse> onSuccess = null, Action<string> onError = null)
    {
        if (string.IsNullOrEmpty(cache.SessionId))
        {
            onError?.Invoke("No active session.");
            yield break;
        }

        var requestData = new ResetCaseRequest();
        if (!string.IsNullOrEmpty(difficulty))
        {
            requestData.difficulty = difficulty;
        }

        string jsonData = JsonUtility.ToJson(requestData);
        string endpoint = $"/cases/{cache.SessionId}/reset";

        yield return SendPostRequest(endpoint, jsonData, (responseText) =>
        {
            try
            {
                CaseResponse caseResponse = JsonUtility.FromJson<CaseResponse>(responseText);
                cache.CurrentCase = caseResponse;
                StartCoroutine(RefreshCaseState(() =>
                {
                    // After refreshing state, update CurrentCase with full case data from CurrentState
                    // But keep the action points from the reset response (new case initial AP)
                    if (cache.CurrentState != null && cache.CurrentCase != null)
                    {
                        cache.CurrentCase.@case = cache.CurrentState.@case;
                        cache.CurrentCase.store = cache.CurrentState.store;
                        // Keep actionPoints from caseResponse (new case initial value), don't overwrite with CurrentState
                        // Also update CurrentState to use the new initial AP from reset response
                        cache.CurrentState.actionPoints = caseResponse.actionPoints;
                        cache.CurrentCase.actionPoints = caseResponse.actionPoints;
                        cache.CurrentCase.nextAbilityCost = cache.CurrentState.nextAbilityCost;
                    }
                    onSuccess?.Invoke(caseResponse);
                }, onError));
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to parse reset response: {e.Message}");
            }
        }, onError);
    }

    [Serializable]
    private class ResetCaseRequest
    {
        public string difficulty;
    }

    /// <summary>
    /// Advance to next story
    /// </summary>
    public IEnumerator AdvanceStory(Action<CaseResponse> onSuccess = null, Action<string> onError = null)
    {
        if (string.IsNullOrEmpty(cache.SessionId))
        {
            onError?.Invoke("No active session.");
            yield break;
        }

        string endpoint = $"/cases/{cache.SessionId}/advance";

        yield return SendPostRequest(endpoint, "{}", (responseText) =>
        {
            try
            {
                CaseResponse caseResponse = JsonUtility.FromJson<CaseResponse>(responseText);
                cache.SessionId = caseResponse.sessionId;
                cache.CurrentCase = caseResponse;
                StartCoroutine(RefreshCaseState(() =>
                {
                    // After refreshing state, update CurrentCase with full case data from CurrentState
                    // But keep the action points from the advance response (new case initial AP)
                    if (cache.CurrentState != null && cache.CurrentCase != null)
                    {
                        cache.CurrentCase.@case = cache.CurrentState.@case;
                        cache.CurrentCase.store = cache.CurrentState.store;
                        // Keep actionPoints from caseResponse (new case initial value), don't overwrite with CurrentState
                        // Also update CurrentState to use the new initial AP from advance response
                        cache.CurrentState.actionPoints = caseResponse.actionPoints;
                        cache.CurrentCase.actionPoints = caseResponse.actionPoints;
                        cache.CurrentCase.nextAbilityCost = cache.CurrentState.nextAbilityCost;
                    }
                    onSuccess?.Invoke(caseResponse);
                }, onError));
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to parse advance response: {e.Message}");
            }
        }, onError);
    }

    // ============================================================================
    // Convenience Functions for Case Generation
    // ============================================================================

    /// <summary>
    /// Generate a new case with default parameters (story 0, medium difficulty)
    /// </summary>
    public IEnumerator GenerateNewCase(Action<CaseResponse> onSuccess, Action<string> onError)
    {
        yield return CreateCase(0, "medium", onSuccess, onError);
    }

    /// <summary>
    /// Generate a new case with specified difficulty
    /// </summary>
    public IEnumerator GenerateNewCase(string difficulty, Action<CaseResponse> onSuccess, Action<string> onError)
    {
        yield return CreateCase(0, difficulty, onSuccess, onError);
    }

    /// <summary>
    /// Generate a new case with specified story index and difficulty
    /// </summary>
    public IEnumerator GenerateNewCase(int storyIndex, string difficulty, Action<CaseResponse> onSuccess, Action<string> onError)
    {
        yield return CreateCase(storyIndex, difficulty, onSuccess, onError);
    }

    /// <summary>
    /// Generate a new case with random seed for variety
    /// </summary>
    public IEnumerator GenerateNewCaseWithRandomSeed(int storyIndex, string difficulty, Action<CaseResponse> onSuccess, Action<string> onError)
    {
        // Generate random seed
        int randomSeed = UnityEngine.Random.Range(0, int.MaxValue);
        yield return CreateCaseWithSeed(storyIndex, difficulty, randomSeed, onSuccess, onError);
    }

    /// <summary>
    /// Generate a new case with specific seed (for reproducible cases)
    /// </summary>
    public IEnumerator CreateCaseWithSeed(int storyIndex, string difficulty, int seed, Action<CaseResponse> onSuccess, Action<string> onError)
    {
        var requestData = new CreateCaseRequest
        {
            storyIndex = storyIndex,
            difficulty = difficulty,
            seed = seed
        };

        string jsonData = JsonUtility.ToJson(requestData);
        string endpoint = "/cases";

        yield return SendPostRequest(endpoint, jsonData, (responseText) =>
        {
            try
            {
                CaseResponse caseResponse = JsonUtility.FromJson<CaseResponse>(responseText);
                
                // Update cache
                cache.SessionId = caseResponse.sessionId;
                cache.CurrentCase = caseResponse;
                
                // Immediately get full state
                StartCoroutine(RefreshCaseState(() =>
                {
                    onSuccess?.Invoke(caseResponse);
                }, onError));
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to parse case response: {e.Message}");
            }
        }, onError);
    }

    /// <summary>
    /// Generate a new random case (random story, random difficulty)
    /// </summary>
    public IEnumerator GenerateRandomCase(Action<CaseResponse> onSuccess, Action<string> onError)
    {
        // First get available stories
        yield return GetStories(
            (stories) =>
            {
                if (stories == null || stories.Count == 0)
                {
                    onError?.Invoke("No stories available.");
                    return;
                }

                // Random story index
                int randomStoryIndex = UnityEngine.Random.Range(0, stories.Count);
                
                // Random difficulty
                string[] difficulties = { "easy", "medium", "hard" };
                string randomDifficulty = difficulties[UnityEngine.Random.Range(0, difficulties.Length)];

                StartCoroutine(CreateCase(randomStoryIndex, randomDifficulty, onSuccess, onError));
            },
            onError
        );
    }

    /// <summary>
    /// Next story - convenience wrapper for AdvanceStory
    /// </summary>
    public IEnumerator NextStory(Action<CaseResponse> onSuccess = null, Action<string> onError = null)
    {
        yield return AdvanceStory(onSuccess, onError);
    }

    /// <summary>
    /// Generate a new case for the same story (reset current case)
    /// </summary>
    public IEnumerator GenerateNewCaseForCurrentStory(Action<CaseResponse> onSuccess = null, Action<string> onError = null)
    {
        yield return ResetCase(null, onSuccess, onError);
    }

    /// <summary>
    /// Generate a new case for the same story with different difficulty
    /// </summary>
    public IEnumerator GenerateNewCaseForCurrentStory(string difficulty, Action<CaseResponse> onSuccess = null, Action<string> onError = null)
    {
        yield return ResetCase(difficulty, onSuccess, onError);
    }

    // ============================================================================
    // VIII. Solution (Truth Revelation)
    // ============================================================================

    /// <summary>
    /// Reveal solution
    /// </summary>
    public IEnumerator RevealSolution(Action<SolutionData> onSuccess, Action<string> onError)
    {
        if (string.IsNullOrEmpty(cache.SessionId))
        {
            onError?.Invoke("No active session.");
            yield break;
        }

        string endpoint = $"/cases/{cache.SessionId}/solution/reveal";

        yield return SendPostRequest(endpoint, "{}", (responseText) =>
        {
            try
            {
                SolutionResponse solutionResponse = JsonUtility.FromJson<SolutionResponse>(responseText);
                onSuccess?.Invoke(solutionResponse.solution);
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to parse solution response: {e.Message}");
            }
        }, onError);
    }

    /// <summary>
    /// Get revealed solution
    /// </summary>
    public IEnumerator GetSolution(Action<SolutionData> onSuccess, Action<string> onError)
    {
        if (string.IsNullOrEmpty(cache.SessionId))
        {
            onError?.Invoke("No active session.");
            yield break;
        }

        string endpoint = $"/cases/{cache.SessionId}/solution";

        yield return SendGetRequest(endpoint, (responseText) =>
        {
            try
            {
                SolutionData solution = JsonUtility.FromJson<SolutionData>(responseText);
                onSuccess?.Invoke(solution);
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to parse solution: {e.Message}");
            }
        }, onError);
    }

    // ============================================================================
    // IX. Stories (Story List)
    // ============================================================================

    [Serializable]
    public class StoryInfo
    {
        public string id;
        public string title;
        public string[] tags;
        public StoryMetadata metadata;
    }

    [Serializable]
    public class StoryMetadata
    {
        public string blurb;
    }

    [Serializable]
    public class StoriesResponse
    {
        public StoryInfo[] stories;
    }

    /// <summary>
    /// Get available stories list
    /// </summary>
    public IEnumerator GetStories(Action<List<StoryInfo>> onSuccess, Action<string> onError)
    {
        string endpoint = "/stories";

        yield return SendGetRequest(endpoint, (responseText) =>
        {
            try
            {
                StoriesResponse storiesResponse = JsonUtility.FromJson<StoriesResponse>(responseText);
                onSuccess?.Invoke(storiesResponse.stories.ToList());
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to parse stories response: {e.Message}");
            }
        }, onError);
    }

    // ============================================================================
    // X. Progress & Statistics
    // ============================================================================

    [Serializable]
    public class StoryScore
    {
        public int correct;
        public int total;
        public int accuracy;
        public int errorRate;
    }

    [Serializable]
    public class OverallStats
    {
        public int totalCorrect;
        public int totalQuestions;
        public int overallAccuracy;
        public int overallErrorRate;
        public int completedCount;
    }

    [Serializable]
    public class ProgressResponse
    {
        public int[] completedStories;
        public int[] unlockedStories;
        public int lastStoryIndex;
        public StoryScoreEntry[] storyScores; // Array format for Unity JsonUtility compatibility
        public OverallStats overallStats;
    }

    [Serializable]
    public class StoryScoreEntry
    {
        public string key; // Story index as string (e.g., "0", "1", "2")
        public StoryScore value;
    }

    [Serializable]
    public class StoryScoresWrapper
    {
        public StoryScoreEntry[] scores;
    }

    [Serializable]
    public class StatisticsResponse
    {
        public OverallStats overallStats;
        public StoryScoresWrapper storyScores;
    }

    [Serializable]
    public class StoryScoreResponse
    {
        public int storyIndex;
        public StoryScore score;
    }

    [Serializable]
    public class SaveProgressRequest
    {
        public string playerId;
        public int storyIndex;
        public ScoreData quizScore;
        public int actionPoints;
    }

    [Serializable]
    public class SaveProgressResponse
    {
        public bool success;
        public ProgressResponse progress;
    }

    [Serializable]
    public class ResetProgressRequest
    {
        public string playerId;
    }

    [Serializable]
    public class ResetProgressResponse
    {
        public bool success;
        public string message;
    }

    /// <summary>
    /// Get player progress
    /// </summary>
    public IEnumerator GetProgress(string playerId, Action<ProgressResponse> onSuccess, Action<string> onError)
    {
        string endpoint = $"/progress?playerId={playerId ?? "default"}";

        yield return SendGetRequest(endpoint, (responseText) =>
        {
            try
            {
                ProgressResponse progress = JsonUtility.FromJson<ProgressResponse>(responseText);
                onSuccess?.Invoke(progress);
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to parse progress response: {e.Message}");
            }
        }, onError);
    }

    /// <summary>
    /// Save/update player progress
    /// </summary>
    public IEnumerator SaveProgress(
        int storyIndex,
        ScoreData quizScore,
        int actionPoints,
        Action<SaveProgressResponse> onSuccess,
        Action<string> onError,
        string playerId = null
    )
    {
        var request = new SaveProgressRequest
        {
            playerId = playerId ?? "default",
            storyIndex = storyIndex,
            quizScore = quizScore,
            actionPoints = actionPoints
        };

        string jsonData = JsonUtility.ToJson(request);
        string endpoint = "/progress";

        yield return SendPostRequest(endpoint, jsonData, (responseText) =>
        {
            try
            {
                SaveProgressResponse response = JsonUtility.FromJson<SaveProgressResponse>(responseText);
                onSuccess?.Invoke(response);
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to parse save progress response: {e.Message}");
            }
        }, onError);
    }

    /// <summary>
    /// Get overall statistics
    /// </summary>
    public IEnumerator GetStatistics(string playerId, Action<StatisticsResponse> onSuccess, Action<string> onError)
    {
        string endpoint = $"/progress/statistics?playerId={playerId ?? "default"}";

        yield return SendGetRequest(endpoint, (responseText) =>
        {
            try
            {
                StatisticsResponse stats = JsonUtility.FromJson<StatisticsResponse>(responseText);
                onSuccess?.Invoke(stats);
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to parse statistics response: {e.Message}");
            }
        }, onError);
    }

    /// <summary>
    /// Get score for a specific story
    /// </summary>
    public IEnumerator GetStoryScore(int storyIndex, string playerId, Action<StoryScoreResponse> onSuccess, Action<string> onError)
    {
        string endpoint = $"/progress/story/{storyIndex}?playerId={playerId ?? "default"}";

        yield return SendGetRequest(endpoint, (responseText) =>
        {
            try
            {
                StoryScoreResponse response = JsonUtility.FromJson<StoryScoreResponse>(responseText);
                onSuccess?.Invoke(response);
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to parse story score response: {e.Message}");
            }
        }, onError);
    }

    /// <summary>
    /// Reset all progress
    /// </summary>
    public IEnumerator ResetProgress(string playerId, Action<ResetProgressResponse> onSuccess, Action<string> onError)
    {
        var request = new ResetProgressRequest
        {
            playerId = playerId ?? "default"
        };

        string jsonData = JsonUtility.ToJson(request);
        string endpoint = "/progress/reset";

        yield return SendPostRequest(endpoint, jsonData, (responseText) =>
        {
            try
            {
                ResetProgressResponse response = JsonUtility.FromJson<ResetProgressResponse>(responseText);
                onSuccess?.Invoke(response);
            }
            catch (Exception e)
            {
                onError?.Invoke($"Failed to parse reset progress response: {e.Message}");
            }
        }, onError);
    }

    /// <summary>
    /// Helper: Get story score from progress response by story index
    /// </summary>
    public StoryScore GetStoryScoreFromProgress(ProgressResponse progress, int storyIndex)
    {
        if (progress?.storyScores == null) return null;
        
        string key = storyIndex.ToString();
        var entry = System.Array.Find(progress.storyScores, e => e.key == key);
        return entry?.value;
    }

    /// <summary>
    /// Helper: Check if all stories are completed
    /// </summary>
    public bool AreAllStoriesCompleted(ProgressResponse progress, int totalStories)
    {
        if (progress?.completedStories == null) return false;
        return progress.completedStories.Length >= totalStories && totalStories > 0;
    }
}

