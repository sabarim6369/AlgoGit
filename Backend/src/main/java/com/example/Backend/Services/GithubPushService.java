package com.example.Backend.Services;

import com.example.Backend.Models.Submissionmodel;
import com.example.Backend.Models.authmodel;
import com.example.Backend.Repositories.Authrepo;
import com.example.Backend.Repositories.Submissionrepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Base64;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Service
public class GithubPushService {
    @Autowired
    private Authrepo authrepo;

    public boolean pushToRepo(String email, String questionTitle, String code, String explanation,String platform) {
        authmodel data = authrepo.findByEmail(email);
        if (data == null || data.getGithuburl() == null || data.getGithubAccessToken() == null) {
            System.out.println("❌ Missing data for email: " + email);
            return false;
        }

        try {
            String repoUrl = data.getGithuburl(); // ex: https://github.com/username/repo.git
            String token = data.getGithubAccessToken();
            String[] parts = repoUrl.replace("https://github.com/", "").replace(".git", "").split("/");
            String owner = parts[0];
            String repo = parts[1];

            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(token);

            // Format folder name from question title (e.g., remove spaces/special chars)
            String folderName = platform + "/" + sanitizeTitle(questionTitle);

            // Push solution.java
            boolean codePush = pushFileToGithub(
                    restTemplate, headers, owner, repo,
                    folderName + "/solution.java",
                    "Add solution for: " + questionTitle,
                    code
            );

            // Push explanation.txt
            boolean explanationPush = pushFileToGithub(
                    restTemplate, headers, owner, repo,
                    folderName + "/explanation.txt",
                    "Add explanation for: " + questionTitle,
                    explanation
            );

            return codePush && explanationPush;

        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    private boolean pushFileToGithub(RestTemplate restTemplate, HttpHeaders headers,
                                     String owner, String repo, String filePath,
                                     String commitMessage, String content) {
        try {
            String encodedContent = Base64.getEncoder().encodeToString(content.getBytes(StandardCharsets.UTF_8));
            String apiUrl = "https://api.github.com/repos/" + owner + "/" + repo + "/contents/" + filePath;

            Map<String, Object> body = Map.of(
                    "message", commitMessage,
                    "content", encodedContent
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.PUT, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                System.out.println("✅ File pushed: " + filePath);
                return true;
            } else {
                System.out.println("❌ Failed to push: " + filePath + " → " + response.getStatusCode());
                return false;
            }
        } catch (Exception ex) {
            ex.printStackTrace();
            return false;
        }
    }

    private String sanitizeTitle(String title) {
        return title.trim().replaceAll("[^a-zA-Z0-9]", "_"); // Remove special chars/spaces
    }
}
