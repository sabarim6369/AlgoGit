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

    public PushResult pushToRepo(String email, String questionTitle, String code, String explanation, String platform, String language) {
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

            String concept = aiService.extractConcept(code);
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

            boolean explanationPush = pushFileToGithub(
                    restTemplate, headers, owner, repo,
                    folderName + "/explanation.txt",
                    "Add explanation for: " + questionTitle,
                    explanation
            );

            boolean success = codePush && explanationPush;
            String githubFolderUrl = "https://github.com/" + owner + "/" + repo + "/tree/main/" + folderName;
            String githubFileUrl = "https://github.com/" + owner + "/" + repo + "/blob/main/" + filePath;

            return new PushResult(success, folderName, filePath, githubFolderUrl, githubFileUrl, concept);

        } catch (Exception e) {
            e.printStackTrace();
            return new PushResult(false);
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
