package com.example.Backend.Services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class AiService {

    @Value("${groq.api.key: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}")
    private String apiKey;

    private static final String API_URL = "https://api.groq.com/openai/v1/chat/completions";
    // Groq high-performance model list in priority order
    private static final List<String> MODELS = List.of(
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "openai/gpt-oss-20b"
    );

    /**
     * Extracts algorithmic concept tag (e.g. Dynamic_Programming, Two_Pointers).
     */
    public String extractConcept(String code) {
        String instruction = "Given a code snippet, identify the main computer science concept or topic used " +
                "(e.g., Array, Two Pointers, Sliding Window, Dynamic Programming, String, Tree, Graph, Greedy, Binary Search, Stack, Queue, Math, Database). " +
                "Respond with only the concept name in 1 to 3 words. Do not include markdown, punctuation, or any extra text.";

        String response = callGroqWithFallback(instruction, code, 30);
        if (response != null && !response.isBlank()) {
            String sanitized = response.trim()
                    .replace("\"", "")
                    .replace("'", "")
                    .replace(".", "")
                    .replaceAll("[^a-zA-Z0-9]+", "_");
            if (!sanitized.isEmpty() && !sanitized.toLowerCase().contains("error")) {
                System.out.println("💡 Identified concept: " + sanitized);
                return sanitized;
            }
        }
        return "General";
    }

    /**
     * Generates a comprehensive, structured GitHub Markdown README for the solved problem.
     * Includes clickable problem link, Shields.io badges, description, constraints, math equations,
     * step-by-step algorithm, and complexity table.
     */
    public String generateReadme(String title, String platform, String difficulty, String language,
                                 String code, String problemUrl, String problemDescription, String concept) {

        String safeTitle = (title != null && !title.isBlank()) ? title : "Problem Solution";
        String safePlatform = (platform != null && !platform.isBlank()) ? platform : "LeetCode";
        String safeDifficulty = (difficulty != null && !difficulty.isBlank()) ? difficulty : "Medium";
        String safeLang = (language != null && !language.isBlank()) ? language : "java";
        String safeConcept = (concept != null && !concept.isBlank()) ? concept : "Algorithms";
        String safeUrl = (problemUrl != null && !problemUrl.isBlank()) ? problemUrl : "#";

        String systemInstruction = """
                You are an expert algorithms educator and technical writer.
                Generate a comprehensive, beautiful GitHub Markdown README.md for a solved coding problem.
                
                You MUST follow this exact structure:
                
                # [{Title}]({ProblemUrl})
                
                {ShieldsBadges}
                
                ## 📝 Problem Statement
                {Formatted problem description with clear examples}
                
                ### Constraints
                {Formatted constraints list}
                
                ## 💡 Approach & Intuition
                {Explain the intuition behind the algorithm. Use mathematical formulations, recurrence relations, and equations with LaTeX/Markdown math notation like $O(N)$, $dp[i] = \\max(...)$, etc.}
                
                ## 📋 Step-by-Step Algorithm
                {Numbered clear steps}
                
                ## ⏱️ Complexity Analysis
                | Metric | Complexity | Description / Justification |
                | :--- | :--- | :--- |
                | ⏱️ **Time Complexity** | `$O(...)`$ | Explanation... |
                | 💾 **Space Complexity** | `$O(...)`$ | Explanation... |
                
                ## 💻 Code Solution
                ```{Language}
                {Code}
                ```
                
                RULES:
                - Do NOT wrap the entire output in triple backticks. Output raw Markdown directly.
                - Ensure math formulas use $...$ or $$...$$ syntax.
                - Be thorough, pedagogical, and accurate.
                """;

        String userPrompt = String.format("""
                Problem Title: %s
                Platform: %s
                Difficulty: %s
                Language: %s
                Concept: %s
                Problem URL: %s
                
                Problem Description & Constraints from webpage:
                %s
                
                Solution Code:
                %s
                """,
                safeTitle, safePlatform, safeDifficulty, safeLang, safeConcept, safeUrl,
                (problemDescription != null && !problemDescription.isBlank()) ? problemDescription : "Not provided. Reconstruct the problem statement and standard constraints based on the title and code.",
                code
        );

        String aiResponse = callGroqWithFallback(systemInstruction, userPrompt, 2048);
        if (aiResponse != null && !aiResponse.isBlank() && !aiResponse.toLowerCase().contains("error calling groq")) {
            String cleaned = cleanMarkdownResponse(aiResponse);
            // Ensure title link is present if AI omitted it
            if (!cleaned.contains("# [" + safeTitle + "]") && !cleaned.contains(safeTitle)) {
                cleaned = "# [" + safeTitle + "](" + safeUrl + ")\n\n" + cleaned;
            }
            return cleaned;
        }

        // Resilient fallback when AI service is unavailable
        System.out.println("⚠️ Groq API unavailable, using deterministic high-quality README fallback");
        return buildFallbackReadme(safeTitle, safePlatform, safeDifficulty, safeLang, code, safeUrl, problemDescription, safeConcept);
    }

    /**
     * Backward-compatible helper method.
     */
    public String summarizeSolution(String code) {
        String instruction = "You are an assistant. Write a step-by-step explanation of the concept used in the given code.";
        String res = callGroqWithFallback(instruction, code, 500);
        return (res != null) ? res : "Solution analyzed using standard algorithmic techniques.";
    }

    /**
     * Executes Groq API call with model fallback.
     */
    private String callGroqWithFallback(String systemPrompt, String userPrompt, int maxTokens) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        List<Map<String, String>> messages = List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
        );

        for (String model : MODELS) {
            try {
                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("model", model);
                requestBody.put("messages", messages);
                if (maxTokens > 0) {
                    requestBody.put("max_tokens", maxTokens);
                }

                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
                ResponseEntity<Map> response = restTemplate.postForEntity(API_URL, entity, Map.class);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
                    if (choices != null && !choices.isEmpty()) {
                        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                        return (String) message.get("content");
                    }
                }
            } catch (Exception e) {
                System.err.println("❌ Model " + model + " failed: " + e.getMessage());
            }
        }
        return null;
    }

    /**
     * Strips accidental leading/trailing markdown fences if the LLM wraps the response in ```markdown ... ```.
     */
    private String cleanMarkdownResponse(String text) {
        String trimmed = text.trim();
        if (trimmed.startsWith("```markdown")) {
            trimmed = trimmed.substring("```markdown".length()).trim();
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring("```".length()).trim();
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3).trim();
        }
        return trimmed;
    }

    /**
     * Generates a complete, beautiful GitHub-ready Markdown document if the AI model is offline.
     */
    private String buildFallbackReadme(String title, String platform, String difficulty, String language,
                                       String code, String problemUrl, String description, String concept) {

        String diffColor = switch (difficulty.toLowerCase()) {
            case "easy" -> "brightgreen";
            case "hard" -> "red";
            default -> "orange";
        };

        String platformLogo = platform.equalsIgnoreCase("leetcode") ? "leetcode" : "geeksforgeeks";
        String platformColor = platform.equalsIgnoreCase("leetcode") ? "FFA116" : "298D46";
        String conceptTag = concept.replace("_", "%20");

        StringBuilder sb = new StringBuilder();
        sb.append("# [").append(title).append("](").append(problemUrl).append(")\n\n");

        // Shields Badges
        sb.append("[![Platform: ").append(platform).append("](https://img.shields.io/badge/Platform-")
                .append(platform).append("-").append(platformColor).append("?style=for-the-badge&logo=")
                .append(platformLogo).append(")](").append(problemUrl).append(")\n");
        sb.append("[![Difficulty: ").append(difficulty).append("](https://img.shields.io/badge/Difficulty-")
                .append(difficulty).append("-").append(diffColor).append("?style=for-the-badge)](#)\n");
        sb.append("[![Concept: ").append(concept.replace("_", " ")).append("](https://img.shields.io/badge/Concept-")
                .append(conceptTag).append("-blueviolet?style=for-the-badge)](#)\n");
        sb.append("[![Language: ").append(language).append("](https://img.shields.io/badge/Language-")
                .append(language).append("-informational?style=for-the-badge)](#)\n");
        sb.append("[![Time Complexity](https://img.shields.io/badge/Time_Complexity-O(N)-brightgreen?style=for-the-badge)](#)\n");
        sb.append("[![Space Complexity](https://img.shields.io/badge/Space_Complexity-O(1)-blue?style=for-the-badge)](#)\n\n");

        sb.append("---\n\n");

        // Problem Statement
        sb.append("## 📝 Problem Statement\n\n");
        if (description != null && !description.isBlank()) {
            sb.append(description.trim()).append("\n\n");
        } else {
            sb.append("Problem description extracted from [").append(platform).append("](").append(problemUrl).append(").\n\n");
        }

        // Approach & Intuition
        sb.append("## 💡 Approach & Intuition\n\n");
        sb.append("This problem is solved using a **").append(concept.replace("_", " ")).append("** approach.\n\n");
        sb.append("### Mathematical Intuition\n");
        sb.append("- For an input sequence of size $N$, we iterate through the elements while maintaining optimal state in $O(1)$ auxiliary storage.\n");
        sb.append("- Recurrence relation / condition: $\\forall i \\in [0, N-1]$, check state validity against problem constraints.\n\n");

        // Step-by-Step
        sb.append("## 📋 Step-by-Step Algorithm\n\n");
        sb.append("1. **Initialization**: Configure data structures and boundary condition checks.\n");
        sb.append("2. **Traversal**: Scan through elements and apply the `").append(concept.replace("_", " ")).append("` strategy.\n");
        sb.append("3. **Termination**: Return the computed optimal result.\n\n");

        // Complexity Table
        sb.append("## ⏱️ Complexity Analysis\n\n");
        sb.append("| Metric | Complexity | Description |\n");
        sb.append("| :--- | :--- | :--- |\n");
        sb.append("| ⏱️ **Time Complexity** | `$O(N)$` | Linear pass over the input collection. |\n");
        sb.append("| 💾 **Space Complexity** | `$O(1)$` | In-place computation with constant extra space. |\n\n");

        // Code
        sb.append("## 💻 Code Solution\n\n");
        sb.append("```").append(language.toLowerCase()).append("\n");
        sb.append(code.trim()).append("\n");
        sb.append("```\n");

        return sb.toString();
    }
}

