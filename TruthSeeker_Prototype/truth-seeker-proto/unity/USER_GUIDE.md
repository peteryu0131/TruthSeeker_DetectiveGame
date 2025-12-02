# Truth Seeker API - User Guide for Unity Developers

## Overview

The `TruthSeekerViewModel` class provides a simple interface to interact with the Truth Seeker backend API. All HTTP requests and JSON parsing are handled automatically - you just call methods and get data.

## File Structure: TruthSeekerViewModel.cs

The `TruthSeekerViewModel.cs` file contains three main parts:

### 1. Data Models (Lines 1-183)
These classes match the JSON structure returned by the backend API:
- `CaseResponse` - Response when creating a case
- `CaseData` - Case information (narrative, suspects, clues, etc.)
- `Suspect` - Suspect information (name, occupation, clothing, role)
- `Clue` - Clue information (id, title, text, category)
- `StatementEntry` - Statement/clue entry
- `StoreEntry` - Store item (purchasable clue)
- `QuizQuestion` - Quiz question with options
- `SolutionData` - Solution/truth data
- And more...

**You don't need to create these manually** - they're automatically populated when you call ViewModel methods.

### 2. Cache Class (Lines 188-194)
```csharp
public class GameStateCache
{
    public string SessionId;
    public CaseResponse CurrentCase;
    public CaseStateResponse CurrentState;
    public List<QuizQuestion> QuizQuestions;
}
```

This caches the current game state so you don't need to make repeated API calls. **You don't interact with this directly** - it's managed automatically by the ViewModel.

### 3. Main ViewModel Class (Lines 200-888)
The `TruthSeekerViewModel` class provides all the methods you'll use:

**Synchronous Methods** (use immediately, no coroutine needed):
- `GetDescriptionText()` - Get case description
- `GetAllSuspects()` - Get all suspects
- `GetInitialStatements()` - Get initial clues
- `GetActionPoints()` - Get current action points
- etc.

**Asynchronous Methods** (must use `StartCoroutine()`):
- `CreateCase()` - Create new case
- `PurchaseClue()` - Purchase a clue
- `LoadQuizQuestions()` - Load quiz
- `SubmitQuizAnswers()` - Submit quiz answers
- etc.

**You only need to call these methods** - all HTTP requests and JSON parsing happen automatically.

## Setup (One Time)

### 1. Add Script to Scene

1. Create an empty GameObject in your scene (name it `TruthSeekerManager`)
2. Add `Truth Seeker View Model` component to it
3. Set `Base Url` = `http://localhost:3000/api` (or your server URL)

### 2. Reference in Your Scripts

In any script that needs to use the API:

```csharp
public TruthSeekerViewModel viewModel;
```

Then in Unity Inspector, drag the `TruthSeekerManager` GameObject to the `viewModel` field.

## Basic Usage

### Starting a New Case

```csharp
void StartNewGame()
{
    StartCoroutine(viewModel.CreateCase(
        storyIndex: 0,           // Which story to play (0 = first story)
        difficulty: "medium",    // "easy", "medium", or "hard"
        onSuccess: (caseResponse) =>
        {
            // Case created successfully!
            // Now you can get all the data
            LoadCaseData();
        },
        onError: (error) =>
        {
            Debug.LogError($"Failed to create case: {error}");
            // Show error to player
        }
    ));
}
```

### Getting Case Information

After creating a case, you can immediately get data:

```csharp
void LoadCaseData()
{
    // Get case description (for your story panel)
    string description = viewModel.GetDescriptionText();
    string title = viewModel.GetCaseTitle();
    
    // Get all suspects (for suspect cards)
    List<Suspect> suspects = viewModel.GetAllSuspects();
    
    // Get initial clues (for statement panel)
    List<StatementEntry> initialClues = viewModel.GetInitialStatements();
    
    // Get current action points
    int actionPoints = viewModel.GetActionPoints();
    
    // Update your UI with this data
    UpdateUI(description, suspects, initialClues, actionPoints);
}
```

## Common Use Cases

### Use Case 1: Display Suspects

```csharp
public Transform suspectContainer;
public GameObject suspectCardPrefab;

void ShowSuspects()
{
    List<Suspect> suspects = viewModel.GetAllSuspects();
    
    foreach (var suspect in suspects)
    {
        GameObject card = Instantiate(suspectCardPrefab, suspectContainer);
        
        // Fill your card UI
        card.transform.Find("Name").GetComponent<Text>().text = suspect.name;
        card.transform.Find("Occupation").GetComponent<Text>().text = suspect.occupation;
        card.transform.Find("Clothing").GetComponent<Text>().text = suspect.clothing;
        card.transform.Find("Role").GetComponent<Text>().text = suspect.role;
    }
}
```

### Use Case 2: Display Clues (Statements)

```csharp
public Transform cluesContainer;
public GameObject clueItemPrefab;

void ShowClues()
{
    // Get initial clues
    List<StatementEntry> initial = viewModel.GetInitialStatements();
    foreach (var clue in initial)
    {
        CreateClueItem(clue, cluesContainer);
    }
    
    // Get purchased clues
    List<StatementEntry> purchased = viewModel.GetPurchasedStatements();
    foreach (var clue in purchased)
    {
        CreateClueItem(clue, cluesContainer);
    }
}

void CreateClueItem(StatementEntry clue, Transform parent)
{
    GameObject item = Instantiate(clueItemPrefab, parent);
    item.transform.Find("Title").GetComponent<Text>().text = clue.title ?? "Untitled";
    item.transform.Find("Text").GetComponent<Text>().text = clue.text;
}
```

### Use Case 3: Store - Show Purchasable Clues

```csharp
public Transform backgroundContainer;
public Transform timelineContainer;
public Transform physicalContainer;
public Transform testimonialContainer;
public GameObject storeItemPrefab;

void ShowStore()
{
    // Show clues by category
    ShowCategory("Background", backgroundContainer);
    ShowCategory("Timeline", timelineContainer);
    ShowCategory("Physical", physicalContainer);
    ShowCategory("Testimonial", testimonialContainer);
}

void ShowCategory(string category, Transform container)
{
    // Clear existing items
    foreach (Transform child in container)
    {
        Destroy(child.gameObject);
    }
    
    // Get clues for this category
    List<StoreEntry> entries = viewModel.GetStoreEntriesByCategory(category);
    
    foreach (var entry in entries)
    {
        GameObject item = Instantiate(storeItemPrefab, container);
        item.transform.Find("Title").GetComponent<Text>().text = entry.clue.title;
        item.transform.Find("Category").GetComponent<Text>().text = entry.category;
        item.transform.Find("Cost").GetComponent<Text>().text = 
            $"Cost: {viewModel.GetNextAbilityCost()} AP";
        
        // Add buy button
        Button buyButton = item.transform.Find("BuyButton").GetComponent<Button>();
        string clueId = entry.clue.id;
        buyButton.onClick.AddListener(() => OnBuyClue(clueId));
    }
}
```

### Use Case 4: Purchase a Clue

```csharp
public Text actionPointsText;

void OnBuyClue(string clueId)
{
    StartCoroutine(viewModel.PurchaseClue(
        clueId,
        onSuccess: (response) =>
        {
            // Purchase successful!
            Debug.Log($"Purchased! Remaining AP: {response.actionPoints}");
            
            // Update UI
            UpdateActionPoints();
            RefreshStore();
            RefreshCluesList();  // Show new purchased clue
        },
        onError: (error) =>
        {
            Debug.LogError($"Purchase failed: {error}");
            // Show error message to player
            ShowErrorDialog("Not enough action points!");
        }
    ));
}

void UpdateActionPoints()
{
    int ap = viewModel.GetActionPoints();
    int cost = viewModel.GetNextAbilityCost();
    actionPointsText.text = $"AP: {ap} (Next: {cost})";
}
```

### Use Case 5: Load and Display Quiz

```csharp
public Transform questionsContainer;
public GameObject questionPrefab;
public Button submitButton;
private Dictionary<string, string> userAnswers = new Dictionary<string, string>();

void LoadQuiz()
{
    StartCoroutine(viewModel.LoadQuizQuestions(
        onSuccess: (questions) =>
        {
            // Display questions
            foreach (var question in questions)
            {
                CreateQuestionUI(question);
            }
            submitButton.interactable = true;
        },
        onError: (error) =>
        {
            Debug.LogError($"Failed to load quiz: {error}");
        }
    ));
}

void CreateQuestionUI(QuizQuestion question)
{
    GameObject questionObj = Instantiate(questionPrefab, questionsContainer);
    questionObj.transform.Find("QuestionText").GetComponent<Text>().text = question.question;
    
    Transform optionsContainer = questionObj.transform.Find("Options");
    for (int i = 0; i < question.options.Length; i++)
    {
        // Create option button/toggle
        GameObject option = new GameObject("Option");
        option.transform.SetParent(optionsContainer);
        
        Button optionButton = option.AddComponent<Button>();
        Text optionText = option.AddComponent<Text>();
        optionText.text = question.options[i];
        
        string selectedOption = question.options[i];
        optionButton.onClick.AddListener(() =>
        {
            userAnswers[question.id] = selectedOption;
        });
    }
}
```

### Use Case 6: Submit Quiz Answers

```csharp
public Text scoreText;

void OnSubmitQuiz()
{
    StartCoroutine(viewModel.SubmitQuizAnswers(
        userAnswers,
        onSuccess: (response) =>
        {
            // Show results
            scoreText.text = $"Score: {response.score.correct}/{response.score.total}";
            
            // Highlight correct/incorrect answers
            foreach (var result in response.results)
            {
                HighlightAnswer(result.questionId, result.correct);
            }
            
            // Update action points (refund based on score)
            UpdateActionPoints();
            Debug.Log($"Refund: {response.refund} AP");
        },
        onError: (error) =>
        {
            Debug.LogError($"Submit failed: {error}");
        }
    ));
}
```

### Use Case 7: Reveal Solution

```csharp
public Text solutionSummaryText;
public Transform solutionDetailsContainer;
public GameObject detailItemPrefab;

void OnRevealSolution()
{
    StartCoroutine(viewModel.RevealSolution(
        onSuccess: (solution) =>
        {
            // Show solution
            solutionSummaryText.text = solution.summary;
            
            foreach (var detail in solution.details)
            {
                GameObject item = Instantiate(detailItemPrefab, solutionDetailsContainer);
                item.GetComponent<Text>().text = detail;
            }
        },
        onError: (error) =>
        {
            Debug.LogError($"Failed to reveal solution: {error}");
        }
    ));
}
```

## Complete Example: Game Manager

```csharp
using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;

public class GameManager : MonoBehaviour
{
    [Header("ViewModel")]
    public TruthSeekerViewModel viewModel;
    
    [Header("UI References")]
    public Text caseTitleText;
    public Text caseDescriptionText;
    public Text actionPointsText;
    public Transform suspectsContainer;
    public Transform cluesContainer;
    public Transform storeContainer;
    public GameObject suspectCardPrefab;
    public GameObject clueItemPrefab;
    public GameObject storeItemPrefab;
    
    void Start()
    {
        StartNewCase();
    }
    
    public void StartNewCase()
    {
        StartCoroutine(viewModel.CreateCase(
            storyIndex: 0,
            difficulty: "medium",
            onSuccess: (response) =>
            {
                LoadAllData();
            },
            onError: (error) =>
            {
                Debug.LogError($"Failed to start case: {error}");
            }
        ));
    }
    
    void LoadAllData()
    {
        // Case info
        caseTitleText.text = viewModel.GetCaseTitle();
        caseDescriptionText.text = viewModel.GetDescriptionText();
        UpdateActionPoints();
        
        // Suspects
        LoadSuspects();
        
        // Clues
        LoadClues();
        
        // Store
        LoadStore();
    }
    
    void LoadSuspects()
    {
        List<Suspect> suspects = viewModel.GetAllSuspects();
        foreach (var suspect in suspects)
        {
            GameObject card = Instantiate(suspectCardPrefab, suspectsContainer);
            // Fill card UI...
        }
    }
    
    void LoadClues()
    {
        List<StatementEntry> clues = viewModel.GetAllStatements();
        foreach (var clue in clues)
        {
            GameObject item = Instantiate(clueItemPrefab, cluesContainer);
            // Fill item UI...
        }
    }
    
    void LoadStore()
    {
        List<StoreEntry> entries = viewModel.GetAllStoreEntries();
        foreach (var entry in entries)
        {
            if (!entry.purchased)
            {
                GameObject item = Instantiate(storeItemPrefab, storeContainer);
                // Fill item UI and add buy button...
            }
        }
    }
    
    void UpdateActionPoints()
    {
        int ap = viewModel.GetActionPoints();
        int cost = viewModel.GetNextAbilityCost();
        actionPointsText.text = $"AP: {ap} (Next: {cost})";
    }
    
    public void OnPurchaseClue(string clueId)
    {
        StartCoroutine(viewModel.PurchaseClue(
            clueId,
            onSuccess: (response) =>
            {
                UpdateActionPoints();
                LoadClues();  // Refresh to show new clue
                LoadStore();  // Refresh to hide purchased item
            },
            onError: (error) =>
            {
                Debug.LogError($"Purchase failed: {error}");
            }
        ));
    }
}
```

## API Methods Quick Reference

### Synchronous Methods (Use Immediately)
```csharp
// Case Info
string desc = viewModel.GetDescriptionText();
string title = viewModel.GetCaseTitle();

// Suspects
List<Suspect> suspects = viewModel.GetAllSuspects();
Suspect suspect = viewModel.GetSuspectByIndex(0);
Suspect suspect = viewModel.GetSuspectById("A");

// Clues
List<StatementEntry> initial = viewModel.GetInitialStatements();
List<StatementEntry> purchased = viewModel.GetPurchasedStatements();
List<StatementEntry> all = viewModel.GetAllStatements();

// Store
List<StoreEntry> all = viewModel.GetAllStoreEntries();
List<StoreEntry> background = viewModel.GetStoreEntriesByCategory("Background");
int ap = viewModel.GetActionPoints();
int cost = viewModel.GetNextAbilityCost();
```

### Asynchronous Methods (Use StartCoroutine)
```csharp
// Case Management
StartCoroutine(viewModel.CreateCase(...));
StartCoroutine(viewModel.ResetCase(...));
StartCoroutine(viewModel.AdvanceStory(...));
StartCoroutine(viewModel.RefreshCaseState(...));

// Store
StartCoroutine(viewModel.PurchaseClue(...));
StartCoroutine(viewModel.PurchaseBackgroundClue(...));
StartCoroutine(viewModel.PurchaseTimelineClue(...));
StartCoroutine(viewModel.PurchasePhysicalClue(...));
StartCoroutine(viewModel.PurchaseTestimonialClue(...));

// Quiz
StartCoroutine(viewModel.LoadQuizQuestions(...));
StartCoroutine(viewModel.SubmitQuizAnswers(...));

// Solution
StartCoroutine(viewModel.RevealSolution(...));
StartCoroutine(viewModel.GetSolution(...));

// Stories
StartCoroutine(viewModel.GetStories(...));
```

## Data Models

### Suspect
```csharp
suspect.id          // "A", "B", "C", "D"
suspect.name        // "Victor", "Grace", etc.
suspect.gender      // "Male", "Female"
suspect.occupation  // "Engineer", "Artist", etc.
suspect.clothing    // "Blue shirt; khaki pants"
suspect.role        // "Father of the baby"
```

### StatementEntry (Clue)
```csharp
clue.id             // "clue_family_relation"
clue.title          // "Family Relations"
clue.text           // Full clue text
clue.origin         // "opening", "support", "purchased"
clue.tags           // Array of tags
```

### StoreEntry
```csharp
entry.category      // "Background", "Timeline", "Physical", "Testimonial"
entry.clue          // Clue object (has id, title, text)
entry.purchased     // true if already bought
```

### QuizQuestion
```csharp
question.id         // "quiz_culprit"
question.question   // "Who abducted the baby?"
question.options    // Array of option strings
question.difficulty // 1, 2, or 3
```

## Important Notes

1. **All network requests are coroutines** - Always use `StartCoroutine()` when calling methods that make HTTP requests
2. **Error handling** - Always provide `onError` callback to handle failures
3. **UI updates** - After purchasing clues, manually refresh your UI lists
4. **Action points** - Get latest value with `GetActionPoints()` after any purchase
5. **Session management** - Session is automatically managed, you don't need to worry about it

## Troubleshooting

### "No active session" error
- Make sure you call `CreateCase()` first before other methods

### Connection errors
- Ensure API server is running: `npm run server`
- Check `BaseUrl` is correct in Inspector

### UI not updating
- After purchasing, call `RefreshCaseState()` or manually refresh your UI
- Check that you're getting data from `viewModel` methods, not from old variables

## Need Help?

- All methods are documented with XML comments in `TruthSeekerViewModel.cs`
- Check the code comments for detailed parameter descriptions
- See examples in this guide for common use cases

