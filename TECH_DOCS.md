# AlgoGit - Comprehensive Technical Architecture & Interview Guide

> **Project Overview**: AlgoGit is an end-to-end automated developer platform consisting of a **Chrome Extension (Manifest V3)**, a **Spring Boot 3.5 (Java 21) Microservice**, **PostgreSQL**, **GitHub REST API Integration**, and **Groq AI**. It automatically captures coding submissions from platforms like LeetCode and GeeksforGeeks, analyzes them with AI for topic classification, pushes cleanly formatted solutions to personal GitHub repositories, tracks coding streaks, and presents an interactive dashboard.

---

## Table of Contents
1. [High-Level Architecture](#1-high-level-architecture)
2. [End-to-End Execution Flow](#2-end-to-end-execution-flow)
3. [Chrome Extension Architecture (Manifest V3)](#3-chrome-extension-architecture-manifest-v3)
   - [The Dual-World Execution Model (Isolated vs Main World)](#the-dual-world-execution-model)
   - [Monaco Editor Virtual Scrolling & Code Extraction](#monaco-editor-virtual-scrolling--code-extraction)
   - [Verdict Detection via MutationObserver](#verdict-detection-via-mutationobserver)
   - [Background Service Worker (`background.js`)](#background-service-worker-backgroundjs)
   - [Popup UI Controller (`popup.js`)](#popup-ui-controller-popupjs)
4. [Backend Microservice Architecture (Spring Boot & PostgreSQL)](#4-backend-microservice-architecture-spring-boot--postgresql)
   - [Database Schema & Entity Models](#database-schema--entity-models)
   - [REST APIs & Controller Layer](#rest-apis--controller-layer)
   - [Streak Calculation Engine](#streak-calculation-engine)
5. [External Service Integrations](#5-external-service-integrations)
   - [GitHub REST API Integration (`GithubPushService`)](#github-rest-api-integration-githubpushservice)
   - [Groq AI Integration (`AiService`)](#groq-ai-integration-aiservice)
   - [GitHub OAuth2 Authentication Flow](#github-oauth2-authentication-flow)
6. [Top Interview Questions & Deep-Dive Answers](#6-top-interview-questions--deep-dive-answers)

---

## 1. High-Level Architecture

```mermaid
graph TD
    subgraph Browser ["User Browser (Chrome Extension)"]
        LC["LeetCode / GFG DOM"]
        MW["Main World Hook (leetcode-main.js)"]
        CS["Content Script (leetcode.js)"]
        SW["Service Worker (background.js)"]
        PU["Popup UI (popup.js)"]
    end

    subgraph BackendServer ["Spring Boot Backend (Port 8080)"]
        SC["SubmissionController"]
        PC["ProblemsController"]
        STC["StreakController"]
        AC["AuthController"]
        GPS["GithubPushService"]
        AI["AiService (Groq)"]
        DB[(PostgreSQL Database)]
    end

    subgraph External ["External Services"]
        GH["GitHub API (Contents / Repos)"]
        GROQ["Groq LLM API (gpt-oss-20b)"]
        GHOAUTH["GitHub OAuth Server"]
    end

    LC -->|User Submits| MW
    MW -->|Memory Buffer / Bridge| CS
    CS -->|Runtime Message| SW
    SW -->|POST /submission/submit| SC
    
    SC -->|Extract Concept| AI
    AI -->|Prompt / Completion| GROQ
    SC -->|Push Code + Notes| GPS
    GPS -->|PUT /contents/{path}| GH
    SC -->|Update Streaks & Records| DB
    
    PU -->|GET /problems, /streak, /recent| BackendServer
    PU -->|Launch WebAuthFlow| GHOAUTH
```

---

## 2. End-to-End Execution Flow

1. **Trigger**: User writes a solution on LeetCode/GFG and clicks the **Submit** button.
2. **Main World Hook**: `leetcode-main.js` (running directly in the webpage context) extracts the active solution from Monaco Editor's in-memory model (`window.monaco.editor.getModels()[0].getValue()`) and language ID, caching it in a shared DOM bridge (`#algogit-code-bridge`).
3. **Verdict Observer**: `leetcode.js` starts a `MutationObserver` watching for terminal submission verdicts (`Accepted`, `Wrong Answer`, `Runtime Error`, etc.).
4. **Data Dispatch**: Upon detecting `Accepted`, `leetcode.js` reads the 100% complete code from the bridge, constructs a submission payload (`platform`, `title`, `code`, `language`, `difficulty`), and dispatches it via `chrome.runtime.sendMessage` to `background.js`.
5. **Enrichment**: `background.js` pulls the user's configured GitHub repository URL and email from `chrome.storage.local` and sends an HTTP POST to `http://localhost:8080/submission/submit`.
6. **AI Classification**: `AiService` sends the solution code to Groq (`openai/gpt-oss-20b`) to extract the algorithmic pattern (e.g. `Sliding Window`, `Dynamic Programming`, `Graph`, `SQL`) and generate an architectural summary.
7. **GitHub Push**: `GithubPushService` encodes the solution to Base64, determines directory collision indices, and issues GitHub REST API calls (`PUT /repos/{owner}/{repo}/contents/{path}`) to create:
   - `/{platform}/{concept}/{title}/solution.{ext}`
   - `/{platform}/{concept}/{title}/explanation.txt`
8. **State Persistence**:
   - Updates `problemsmodel` (incrementing platform & difficulty counters).
   - Recalculates `streakmodel` (current streak, longest streak, active weekdays).
   - Saves a persistent `SubmissionRecord` (direct GitHub file and folder URLs, timestamp).
9. **Desktop Notification & Real-Time UI Sync**:
   - `background.js` triggers a native Chrome desktop notification.
   - The popup's **Recent Submissions Activity Feed** immediately reflects the new solution with a clickable `Code ↗` direct link to GitHub.

---

## 3. Chrome Extension Architecture (Manifest V3)

### The Dual-World Execution Model
In Chrome Manifest V3, content scripts by default run in an **Isolated World**:
* **Isolated World (`leetcode.js`)**: Has access to Chrome Extension APIs (`chrome.runtime.sendMessage`, `chrome.storage`), but **cannot** access webpage JavaScript objects (like `window.monaco` or React state).
* **Main World (`leetcode-main.js`)**: Declared with `"world": "MAIN"` in `manifest.json`. Runs directly in the page's execution context with full access to `window.monaco`, but **cannot** access Chrome Extension APIs.

```
┌────────────────────────────────────────────────────────┐
│  LeetCode Page Context (MAIN World)                    │
│  leetcode-main.js                                      │
│  - Access to: window.monaco                            │
│  - Extracts: monaco.editor.getModels()[0].getValue()   │
│  - Writes full code to: <div id="algogit-code-bridge"> │
└───────────────────────┬────────────────────────────────┘
                        │ (Shared DOM)
┌───────────────────────▼────────────────────────────────┐
│  AlgoGit Content Script (ISOLATED World)               │
│  leetcode.js                                           │
│  - Reads: document.getElementById('algogit-code-bridge')
│  - Gets: 100% full source code (no DOM virtualization) │
│  - Dispatches: chrome.runtime.sendMessage to background│
└────────────────────────────────────────────────────────┘
```

### Monaco Editor Virtual Scrolling & Code Extraction
* **The Pitfall**: LeetCode's Monaco Editor uses **virtual scrolling** (DOM virtualization). It only renders `.view-line` DOM elements for code lines physically visible on the screen. If an 80-line solution is viewed in a 15-line box, lines 16–80 **do not exist in the HTML DOM**.
* **The Solution**: Directly querying `window.monaco.editor.getModels()` accesses Monaco's internal text buffer memory. `model.getValue()` returns 100% of the code, retaining all closing braces `}`, indentation, comments, and exact language metadata (`model.getLanguageId()`).

### Verdict Detection via MutationObserver
* Rather than inefficient interval polling (`setInterval`), `leetcode.js` uses a `MutationObserver`:
  ```javascript
  activeResultObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        const text = node.innerText || '';
        const match = text.match(/\b(Accepted|Wrong Answer|Runtime Error|Time Limit Exceeded|Compilation Error)\b/i);
        if (match) {
          activeResultObserver.disconnect();
          // Extract & dispatch payload
        }
      }
    }
  });
  activeResultObserver.observe(document.body, { childList: true, subtree: true });
  ```
* **Event Delegation**: Clicks on the submit button are captured via `document.addEventListener('click', ..., true)` in the capture phase. This ensures submission tracking persists seamlessly across Single Page Application (SPA) client-side problem navigation without page reloads.

### Background Service Worker (`background.js`)
* Runs on event-driven worker threads.
* Listens for `chrome.runtime.onMessage` with action `'submission'`.
* Fetches user credentials from `chrome.storage.local`, sends the HTTP request to the Spring Boot server, and triggers a Chrome desktop notification (`chrome.notifications.create`).
* Updates `chrome.storage.local` with the latest submission and maintains a FIFO cache of `recentSubmissions`.

### Popup UI Controller (`popup.js`)
* **Zero-Latency Rendering**: Implements a cache-then-network pattern. It instantly loads `recentSubmissions` from `chrome.storage.local`, then calls `POST /submission/recent` asynchronously to merge database updates.
* **Platform Filter**: Filtering by LeetCode, GeeksforGeeks, or All Platforms dynamically updates both the summary metric boxes and the Recent Activity Feed cards.
* **Direct Deep Links**: Generates direct GitHub links (`https://github.com/{owner}/{repo}/blob/main/{path}`) so users can open their exact code file in a single click.

---

## 4. Backend Microservice Architecture (Spring Boot & PostgreSQL)

### Database Schema & Entity Models

```
┌───────────────────┐       ┌────────────────────┐
│     authmodel     │       │   submission_records│
├───────────────────┤       ├────────────────────┤
│ id (PK)           │       │ id (PK)            │
│ email (UQ)        │       │ email              │
│ name              │       │ title              │
│ githuburl         │       │ platform           │
│ githubAccessToken │       │ difficulty         │
└─────────┬─────────┘       │ language           │
          │ 1:1             │ concept            │
          ▼                 │ githubUrl          │
┌───────────────────┐       │ fileUrl            │
│    streakmodel    │       │ submittedAt        │
├───────────────────┤       └────────────────────┘
│ id (PK)           │
│ referenceid (FK)  │       ┌────────────────────┐
│ currentStreak     │       │   problemsmodel    │
│ longestStreak     │       ├────────────────────┤
│ lastSolvedDate    │       │ id (PK)            │
│ monday ... sunday │       │ referenceid (FK)   │
└───────────────────┘       │ leetcodecount      │
                            │ leetcodeEasy...Hard│
                            │ gfgcount...        │
                            └────────────────────┘
```

### REST APIs & Controller Layer

| HTTP Method | Endpoint | Description |
|---|---|---|
| `POST` | `/submission/submit` | Main pipeline: triggers AI classification, GitHub push, streak update, count update, and history logging. |
| `POST` | `/submission/recent` | Returns the user's latest 20 submissions ordered by `submittedAt DESC`. |
| `POST` | `/problems/getcounts` | Returns aggregated problem stats categorized by platform and difficulty. |
| `POST` | `/streak/getstreak` | Returns current streak, longest streak, and day-of-week active booleans. |
| `POST` | `/auth/github/exchange-code` | Exchanges OAuth temporary code for a GitHub personal access token and creates user account. |
| `POST` | `/auth/update-url` | Updates the linked GitHub repository URL for an existing user account. |

### Streak Calculation Engine
Implemented in `Submissioncontroller.java`:
1. Checks user's `lastSolvedDate`.
2. If `lastSolvedDate == today`: Streak remains unchanged (already logged today).
3. If `lastSolvedDate == today - 1 day`: `currentStreak++` (consecutive day streak).
4. If `lastSolvedDate < today - 1 day`: `currentStreak = 1` (streak reset).
5. If `currentStreak > longestStreak`: `longestStreak = currentStreak`.
6. Sets active boolean for current `DayOfWeek` (e.g. `setMonday(true)`).

---

## 5. External Service Integrations

### GitHub REST API Integration (`GithubPushService`)
* **Endpoint**: `PUT https://api.github.com/repos/{owner}/{repo}/contents/{filePath}`
* **Headers**: `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`.
* **Payload**:
  ```json
  {
    "message": "Add solution for: Two Sum",
    "content": "<Base64 Encoded Source Code>"
  }
  ```
* **Folder Collision Resolution**: `getNextFolderIndex(...)` inspects the directory contents via `GET /contents/{path}`. If multiple solutions exist for the same problem, it appends an auto-incrementing suffix (`Two_Sum`, `Two_Sum_2`).
* **Deterministic URLs**: Computes the exact file link:
  `https://github.com/{owner}/{repo}/blob/main/{folderName}/solution.{ext}`

### Groq AI Integration (`AiService`)
* **Endpoint**: `https://api.groq.com/openai/v1/chat/completions`
* **Model**: `openai/gpt-oss-20b` (low latency, high-accuracy code reasoning).
* **Concept Classification**: Analyzes the raw code structure to return standard DSA topics:
  * *Categories*: `Array`, `String`, `Two Pointers`, `Sliding Window`, `Dynamic Programming`, `Graph`, `Trees`, `Stack`, `Queue`, `SQL`, `Math`.

### GitHub OAuth2 Authentication Flow
1. Extension launches `chrome.identity.launchWebAuthFlow` pointing to:
   `https://github.com/login/oauth/authorize?client_id=...&scope=repo`.
2. User approves GitHub permissions.
3. GitHub redirects to Chrome Extension redirect URL with temporary `code`.
4. Extension forwards `code` to backend `POST /auth/github/exchange-code`.
5. Backend makes a server-to-server request to `https://github.com/login/oauth/access_token` using `client_id` and `client_secret`.
6. The resulting access token is securely persisted in PostgreSQL and returned to the extension to activate connected features.

---

## 6. Top Interview Questions & Deep-Dive Answers

### Q1: "Can you give a 2-minute elevator pitch of AlgoGit?"
> **Answer**:  
> "AlgoGit is a full-stack automation tool designed for software engineers practicing data structures and algorithms. When solving problems on LeetCode or GeeksforGeeks, candidates often struggle with maintaining a structured GitHub portfolio and tracking their consistency.  
> I built a Chrome Extension using Manifest V3 that automatically detects accepted submissions, extracts the complete code directly from editor memory buffers, and sends it to a Spring Boot microservice. The backend leverages Groq AI to classify the problem's algorithmic pattern, pushes formatted code and explanations to GitHub via REST API, maintains real-time streaks, and feeds an interactive popup dashboard. It bridges frontend browser automation, microservice architecture, and AI-driven classification."

---

### Q2: "What was the most challenging technical bug you encountered in this project, and how did you resolve it?"
> **Answer**:  
> "The most interesting challenge was **code truncation on LeetCode**. Initially, we attempted to extract code by scraping DOM elements (`.view-line`). However, LeetCode uses Microsoft's Monaco Editor, which implements DOM virtualization — it only renders the lines currently visible in the user's viewport. If a solution had 25 lines but the viewport only showed 13, lines 14–25 literally did not exist in the HTML DOM.  
> 
> Furthermore, in Chrome Manifest V3, content scripts operate in an **Isolated World** sandbox, meaning `window.monaco` was inaccessible.  
> 
> To solve this, I designed a **dual-world execution architecture**:
> 1. I registered a secondary content script in the **Main World** (`world: "MAIN"` in Manifest V3), which runs directly in the page context.
> 2. This script accesses Monaco's in-memory model directly via `window.monaco.editor.getModels()[0].getValue()`, capturing 100% of the code without DOM virtualization limits.
> 3. It communicates with our isolated extension script via a shared DOM bridge and window postMessage channels. This completely eliminated code cutoffs and preserved all syntax, indentation, and closing braces."

---

### Q3: "Why did you use Spring Boot and PostgreSQL for the backend rather than a serverless/Node.js setup?"
> **Answer**:  
> "I chose Spring Boot 3 with Java 21 and PostgreSQL for three reasons:
> 1. **Robust Relational Data Integrity**: Problem counts, weekly streaks, and user credentials have strict relational dependencies. Using Spring Data JPA with transactional boundaries ensures that streak increments and submission logs are atomic.
> 2. **Maintainable Service Layer**: Decoupling the AI service (`AiService`), GitHub REST API service (`GithubPushService`), and persistence layer into dedicated Spring beans makes the codebase modular, testable, and maintainable.
> 3. **Concurrency & Enterprise Scalability**: Spring Boot's multi-threaded model handles simultaneous incoming webhook and API calls efficiently with standard connection pooling (HikariCP)."

---

### Q4: "How does the extension handle Single Page Application (SPA) navigation on LeetCode?"
> **Answer**:  
> "LeetCode is built with Next.js/React and transitions between problems client-side without full page reloads. If you attach click listeners to a specific submit button on page load, navigating to another problem destroys that button instance.  
> To guarantee continuous operation, I used **Event Delegation**: attaching a click listener to the top-level `document` object during the capture phase (`addEventListener('click', handler, true)`). When a click occurs, we inspect `e.target.closest('button')` for submit attributes. Combined with a `MutationObserver` that dynamically starts when submit is clicked and tears down once a verdict is reached, this ensures zero memory leaks and persistent tracking across SPA route transitions."

---

### Q5: "How does your streak algorithm handle edge cases like time zones or multiple submissions on the same day?"
> **Answer**:  
> "The streak engine checks `lastSolvedDate` stored in PostgreSQL:
> * If a user submits multiple problems on the same day, `lastSolvedDate.equals(today)` evaluates to true, so the streak counter is not falsely inflated.
> * If the user submits on consecutive calendar days (`lastSolvedDate.plusDays(1).equals(today)`), the current streak increments by 1.
> * If a day is missed (`lastSolvedDate.isBefore(today.minusDays(1))`), the streak resets to 1.
> * The `longestStreak` is dynamically updated whenever `currentStreak > longestStreak`."

---

### Q6: "If this application scaled to 100,000 active users, what architectural bottlenecks would arise and how would you address them?"
> **Answer**:  
> "At high scale, two primary bottlenecks would emerge:
> 1. **Synchronous GitHub API & AI Calls**: Currently, `/submission/submit` executes LLM summarization and GitHub file pushes synchronously in the HTTP request thread. Under high load or external API latency, request threads would exhaust the connection pool.  
>    * *Solution*: Introduce an asynchronous message broker (RabbitMQ or Apache Kafka). When a submission arrives, acknowledge HTTP 202 Accepted immediately, push the event to a queue, and let background worker consumers process AI classification and GitHub pushes with automated retries and dead-letter queues.
> 2. **GitHub API Rate Limiting**: GitHub limits authenticated API calls per token to 5,000 requests/hour.  
>    * *Solution*: Batch file updates using GitHub's Git Data Trees API (`POST /repos/{owner}/{repo}/git/trees`) rather than individual contents API calls, and implement a client-side or Redis-backed push throttling queue."
