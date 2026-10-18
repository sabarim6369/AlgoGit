package com.example.Backend.Controllers;

import com.example.Backend.Dto.PushResult;
import com.example.Backend.Models.SubmissionRecord;
import com.example.Backend.Models.Submissionmodel;
import com.example.Backend.Models.problemsmodel;
import com.example.Backend.Models.streakmodel;
import com.example.Backend.Repositories.Authrepo;
import com.example.Backend.Repositories.Problemsrepo;
import com.example.Backend.Repositories.Streakrepo;
import com.example.Backend.Repositories.SubmissionRecordRepo;
import com.example.Backend.Repositories.Submissionrepo;
import com.example.Backend.Services.AiService;
import com.example.Backend.Services.GithubPushService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.example.Backend.Dto.SubmissionRequest;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/submission")
public class Submissioncontroller {
    @Autowired
    private Submissionrepo submissionrepo;
    @Autowired
    private SubmissionRecordRepo submissionRecordRepo;
    @Autowired
    private AiService aiService;
    @Autowired
    private GithubPushService githubPushService;
    @Autowired
    private Problemsrepo problemsrepo;
    @Autowired
    private Authrepo authrepo;
    @Autowired
    private Streakrepo streakrepo;
    @PostMapping("/submit")
    public ResponseEntity<?> submit(@RequestBody SubmissionRequest request) {
        String code = request.getCode();
        String platform = request.getPlatform();
        String email = request.getEmail();
        if (email != null) {
            email = email.trim().toLowerCase();
        }
        String title = request.getTitle();
        String language = request.getlanguage();
        String difficulty = request.getDifficulty();
        String status = request.getStatus();

        if ("Wrong Answer".equalsIgnoreCase(status)) {
            Map<String, Object> skipped = new HashMap<>();
            skipped.put("status", "skipped");
            skipped.put("message", "Skipped wrong answer");
            return ResponseEntity.ok(skipped);
        }

        System.out.println("✅✅✅" + request);
        System.out.println("Email😍😍😍😍😍" + email);

        String problemUrl = request.getProblemUrl();
        if (problemUrl == null || problemUrl.trim().isEmpty()) {
            if ("leetcode".equalsIgnoreCase(platform)) {
                String slug = title.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
                problemUrl = "https://leetcode.com/problems/" + slug + "/";
            } else if ("gfg".equalsIgnoreCase(platform)) {
                String slug = title.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
                problemUrl = "https://www.geeksforgeeks.org/problems/" + slug + "/1";
            } else {
                problemUrl = "https://github.com";
            }
        }
        String problemDescription = request.getProblemDescription();

        String concept = aiService.extractConcept(code);
        String readmeContent = aiService.generateReadme(title, platform, difficulty, language, code, problemUrl, problemDescription, concept);
        PushResult pushResult = githubPushService.pushToRepo(email, title, code, readmeContent, platform, language, concept);

        if (pushResult != null && pushResult.isSuccess()) {
            var user = authrepo.findByEmail(email);
            if (user != null) {
                Long refId = user.getId();

                // 🔥 Streak tracking logic
                streakmodel streak = streakrepo.findByReferenceid(refId).orElseGet(() -> {
                    streakmodel s = new streakmodel();
                    s.setReferenceid(refId);
                    return s;
                });

                LocalDate today = LocalDate.now();
                DayOfWeek dow = today.getDayOfWeek();

                switch (dow) {
                    case MONDAY -> streak.setMonday(true);
                    case TUESDAY -> streak.setTuesday(true);
                    case WEDNESDAY -> streak.setWednesday(true);
                    case THURSDAY -> streak.setThursday(true);
                    case FRIDAY -> streak.setFriday(true);
                    case SATURDAY -> streak.setSaturday(true);
                    case SUNDAY -> streak.setSunday(true);
                }

                LocalDate last = streak.getLastSolvedDate();

                if (last != null) {
                    if (last.plusDays(1).equals(today)) {
                        streak.setCurrentStreak(streak.getCurrentStreak() + 1);
                    } else if (!last.equals(today)) {
                        streak.setCurrentStreak(1);
                    }
                } else {
                    streak.setCurrentStreak(1);
                }

                if (streak.getCurrentStreak() > streak.getLongestStreak()) {
                    streak.setLongestStreak(streak.getCurrentStreak());
                }

                streak.setLastSolvedDate(today);
                streakrepo.save(streak);

                // 🎯 Problem count update
                Optional<problemsmodel> problemsModelOpt = problemsrepo.findByReferenceid(refId);
                problemsmodel model = problemsModelOpt.orElseGet(() -> {
                    problemsmodel m = new problemsmodel();
                    m.setReferenceid(refId);
                    return m;
                });

                switch (platform.toLowerCase()) {
                    case "leetcode" -> {
                        model.setLeetcodecount(model.getLeetcodecount() + 1);
                        switch (difficulty.toLowerCase()) {
                            case "easy" -> model.setLeetcodeEasy(model.getLeetcodeEasy() + 1);
                            case "medium" -> model.setLeetcodeMedium(model.getLeetcodeMedium() + 1);
                            case "hard" -> model.setLeetcodeHard(model.getLeetcodeHard() + 1);
                        }
                    }
                    case "gfg" -> {
                        model.setGfgcount(model.getGfgcount() + 1);
                        switch (difficulty.toLowerCase()) {
                            case "easy" -> model.setGfgEasy(model.getGfgEasy() + 1);
                            case "medium" -> model.setGfgMedium(model.getGfgMedium() + 1);
                            case "hard" -> model.setGfgHard(model.getGfgHard() + 1);
                        }
                    }
                    case "hackerrank" -> {
                        model.setHackerrankcount(model.getHackerrankcount() + 1);
                        switch (difficulty.toLowerCase()) {
                            case "easy" -> model.setHackerrankEasy(model.getHackerrankEasy() + 1);
                            case "medium" -> model.setHackerrankMedium(model.getHackerrankMedium() + 1);
                            case "hard" -> model.setHackerrankHard(model.getHackerrankHard() + 1);
                        }
                    }
                    case "codechef" -> {
                        model.setCodechefcount(model.getCodechefcount() + 1);
                        switch (difficulty.toLowerCase()) {
                            case "easy" -> model.setCodechefEasy(model.getCodechefEasy() + 1);
                            case "medium" -> model.setCodechefMedium(model.getCodechefMedium() + 1);
                            case "hard" -> model.setCodechefHard(model.getCodechefHard() + 1);
                        }
                    }
                    default -> System.out.println("⚠️ Unknown platform: " + platform);
                }

                problemsrepo.save(model);
            }

            // Save submission record for history & activity feed
            try {
                SubmissionRecord record = new SubmissionRecord(
                        email,
                        title,
                        platform,
                        difficulty,
                        language,
                        pushResult.getConcept(),
                        pushResult.getGithubUrl(),
                        pushResult.getFileUrl(),
                        LocalDateTime.now()
                );
                submissionRecordRepo.save(record);
            } catch (Exception e) {
                System.err.println("⚠️ Could not save submission record: " + e.getMessage());
            }

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Submission pushed successfully!");
            response.put("title", title);
            response.put("platform", platform);
            response.put("difficulty", difficulty);
            response.put("language", language);
            response.put("concept", pushResult.getConcept());
            response.put("githubUrl", pushResult.getGithubUrl());
            response.put("fileUrl", pushResult.getFileUrl());
            response.put("submittedAt", LocalDateTime.now().toString());

            return ResponseEntity.ok(response);
        } else {
            Map<String, Object> err = new HashMap<>();
            err.put("status", "error");
            err.put("message", "Failed to push submission.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    @PostMapping("/recent")
    public ResponseEntity<List<SubmissionRecord>> getRecentSubmissions(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        if (email != null) {
            email = email.trim().toLowerCase();
            List<SubmissionRecord> records = submissionRecordRepo.findTop20ByEmailOrderBySubmittedAtDesc(email);
            return ResponseEntity.ok(records);
        }
        return ResponseEntity.badRequest().build();
    }
}

