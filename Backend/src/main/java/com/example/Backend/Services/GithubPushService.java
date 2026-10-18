package com.example.Backend.Services;

import com.example.Backend.Models.authmodel;
import com.example.Backend.Repositories.Authrepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import com.example.Backend.Dto.PushResult;

@Service
public class GithubPushService {
    @Autowired
    private Authrepo authrepo;

    @Autowired
    private AiService aiService;

    public PushResult pushToRepo(String email, String questionTitle, String code, String readmeContent, String platform, String language, String concept) {
        authmodel data = authrepo.findByEmail(email);
        if (data == null || data.getGithuburl() == null || data.getGithubAccessToken() == null) {
            System.out.println("❌ Missing data for email: " + email);
            return new PushResult(false);
        }

        try {
            String repoUrl = data.getGithuburl();
            String token = data.getGithubAccessToken();
            String[] parts = repoUrl.replace("https://github.com/", "").replace(".git", "").split("/");
            String owner = parts[0];
            String repo = parts[1];

            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(token);

            if (concept == null || concept.isBlank()) {
                concept = aiService.extractConcept(code);
            }
            String cleanTitle = sanitizeTitle(questionTitle);

            String baseFolder = platform + "/" + concept + "/" + cleanTitle;
            int nextIndex = getNextFolderIndex(restTemplate, headers, owner, repo, platform + "/" + concept, cleanTitle);
            String folderName = baseFolder + (nextIndex == 1 ? "" : ("_" + nextIndex));

            String ext = getFileExtension(language);
            String filePath = folderName + "/solution." + ext;
            boolean codePush = pushFileToGithub(
                    restTemplate, headers, owner, repo,
                    filePath,
                    "Add solution for: " + questionTitle,
                    code
            );

            // Replace explanation.txt with README.md for native GitHub rendering
            String readmePath = folderName + "/README.md";
            boolean readmePush = pushFileToGithub(
                    restTemplate, headers, owner, repo,
                    readmePath,
                    "Add README.md explanation for: " + questionTitle,
                    readmeContent
            );

            boolean success = codePush && readmePush;
            String githubFolderUrl = "https://github.com/" + owner + "/" + repo + "/tree/main/" + folderName;
            String githubFileUrl = "https://github.com/" + owner + "/" + repo + "/blob/main/" + filePath;

            return new PushResult(success, folderName, filePath, githubFolderUrl, githubFileUrl, concept);

        } catch (Exception e) {
            e.printStackTrace();
            return new PushResult(false);
        }
    }

    public PushResult pushToRepo(String email, String questionTitle, String code, String readmeContent, String platform, String language) {
        return pushToRepo(email, questionTitle, code, readmeContent, platform, language, null);
    }

    private boolean pushFileToGithub(RestTemplate restTemplate, HttpHeaders headers,
                                     String owner, String repo, String filePath,
                                     String commitMessage, String content) {
        try {
            String encodedContent = Base64.getEncoder().encodeToString(content.getBytes(StandardCharsets.UTF_8));
            String apiUrl = "https://api.github.com/repos/" + owner + "/" + repo + "/contents/" + filePath;

            Map<String, Object> body = new HashMap<>();
            body.put("message", commitMessage);
            body.put("content", encodedContent);

            // Retrieve existing file SHA if updating existing solution/README
            try {
                HttpEntity<Void> checkRequest = new HttpEntity<>(headers);
                ResponseEntity<Map> checkResp = restTemplate.exchange(apiUrl, HttpMethod.GET, checkRequest, Map.class);
                if (checkResp.getStatusCode().is2xxSuccessful() && checkResp.getBody() != null) {
                    Object sha = checkResp.getBody().get("sha");
                    if (sha != null) {
                        body.put("sha", sha.toString());
                    }
                }
            } catch (Exception ignored) {
                // File does not exist yet (404), which is expected for new submissions
            }

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.PUT, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                System.out.println("✅ File pushed to GitHub: " + filePath);
                return true;
            } else {
                System.err.println("❌ Failed to push: " + filePath + " → " + response.getStatusCode());
                return false;
            }
        } catch (Exception ex) {
            if (ex.getMessage() != null && ex.getMessage().contains("401")) {
                System.err.println("❌ [GitHub 401 Bad Credentials] GitHub Access Token is expired or revoked for repository " + owner + "/" + repo + ".");
                System.err.println("👉 FIX: Open the AlgoGit extension popup, click Logout, and click 'Authenticate with GitHub' to get a fresh token.");
            } else if (ex.getMessage() != null && ex.getMessage().contains("404")) {
                System.err.println("❌ [GitHub 404 Not Found] Repository https://github.com/" + owner + "/" + repo + " was not found or the token does not have write access to it.");
            } else {
                System.err.println("❌ Error pushing file to GitHub: " + ex.getMessage());
            }
            return false;
        }
    }

    private String sanitizeTitle(String title) {
        return title.trim().replaceAll("[^a-zA-Z0-9]", "_");
    }

    private String getFileExtension(String language) {
        if (language == null) return "txt";
        String lower = language.toLowerCase();
        if (lower.contains("python")) return "py";
        if (lower.contains("javascript")) return "js";
        if (lower.contains("typescript")) return "ts";
        if (lower.contains("cpp") || lower.contains("c++")) return "cpp";
        if (lower.contains("c#") || lower.contains("csharp")) return "cs";
        if (lower.equals("c")) return "c";
        if (lower.contains("java")) return "java";
        if (lower.contains("sql") || lower.contains("mysql") || lower.contains("oracle") || lower.contains("postgres")) return "sql";
        if (lower.contains("go")) return "go";
        if (lower.contains("rust")) return "rs";
        if (lower.contains("kotlin")) return "kt";
        if (lower.contains("swift")) return "swift";
        if (lower.contains("ruby")) return "rb";
        if (lower.contains("php")) return "php";
        return "txt";
    }

    private int getNextFolderIndex(RestTemplate restTemplate, HttpHeaders headers,
                                   String owner, String repo, String conceptPath, String cleanTitle) {
        try {
            String apiUrl = "https://api.github.com/repos/" + owner + "/" + repo + "/contents/" + conceptPath;
            HttpEntity<Void> request = new HttpEntity<>(headers);
            ResponseEntity<List> response = restTemplate.exchange(apiUrl, HttpMethod.GET, request, List.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                List<Map<String, Object>> contents = (List<Map<String, Object>>) response.getBody();
                List<String> matchingFolders = contents.stream()
                        .filter(item -> "dir".equals(item.get("type")))
                        .map(item -> (String) item.get("name"))
                        .filter(name -> name.matches(cleanTitle + "(_\\d+)?"))
                        .collect(Collectors.toList());

                int maxIndex = matchingFolders.stream()
                        .map(name -> name.replace(cleanTitle, "").replace("_", ""))
                        .mapToInt(n -> {
                            try {
                                return n.isEmpty() ? 1 : Integer.parseInt(n);
                            } catch (NumberFormatException e) {
                                return 1;
                            }
                        })
                        .max().orElse(0);

                return maxIndex == 0 ? 1 : maxIndex + 1;
            }
        } catch (Exception e) {
            // Log and default to 1
        }
        return 1;
    }
}
