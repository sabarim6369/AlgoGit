package com.example.Backend.Services;

import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class AiService {

    private static final String API_KEY = "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";
    private static final String API_URL = "https://api.groq.com/openai/v1/chat/completions";

    public String summarizeSolution(String code) {
        // Prompt that tells the model what to do
        String instruction = "You are an assistant. Write a step-by-step explanation of the concept used in the given code.";

        // Prepare message list
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", instruction));
        messages.add(Map.of("role", "user", "content", code));

        // Create request body
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "llama3-8b-8192");
        requestBody.put("messages", messages);

        // Set headers
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + API_KEY);  // ✅ Manual setting

        // Send request
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        RestTemplate restTemplate = new RestTemplate();

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(API_URL, entity, Map.class);
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            System.out.println("Concept Explanation:\n" + message.get("content"));
            return (String) message.get("content"); // final step-by-step explanation
        } catch (Exception e) {
            return "Error calling Groq API: " + e.getMessage();
        }
    }
    public String extractConcept(String code) {
        String instruction = "Given a code snippet, identify the main computer science concept used (e.g., dynamic programming, depth-first search, sliding window, greedy). Respond with only the concept name.";

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", instruction));
        messages.add(Map.of("role", "user", "content", code));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "llama3-8b-8192");
        requestBody.put("messages", messages);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + API_KEY);

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            RestTemplate restTemplate = new RestTemplate();

            ResponseEntity<Map> response = restTemplate.postForEntity(API_URL, entity, Map.class);
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");

            String concept = ((String) message.get("content")).trim();
            return concept.replaceAll("[^a-zA-Z0-9]", "_"); // sanitize for folder use
        } catch (Exception e) {
            return "Unknown";
        }
    }

}
