package com.example.Backend.Controllers;

import com.example.Backend.Models.Submissionmodel;
import com.example.Backend.Models.problemsmodel;
import com.example.Backend.Models.streakmodel;
import com.example.Backend.Repositories.Authrepo;
import com.example.Backend.Repositories.Problemsrepo;
import com.example.Backend.Repositories.Streakrepo;
import com.example.Backend.Repositories.Submissionrepo;
import com.example.Backend.Services.AiService;
import com.example.Backend.Services.GithubPushService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.example.Backend.Dto.SubmissionRequest;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/submission")
public class Submissioncontroller {
    @Autowired
    private Submissionrepo submissionrepo;
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
    public String submit(@RequestBody SubmissionRequest request) {
        String code = request.getCode();
        String platform = request.getPlatform();
        String email = request.getEmail();
        String title = request.getTitle();
        String language = request.getlanguage();
        String difficulty = request.getDifficulty();
        String status = request.getStatus();

        if ("Wrong Answer".equalsIgnoreCase(status)) {
            return "Skipped wrong answer";
        }

        System.out.println("✅✅✅" + request);
        System.out.println("Email😍😍😍😍😍" + email);

        String summary = aiService.summarizeSolution(code);
        boolean pushed = githubPushService.pushToRepo(email, title, code, summary, platform, language);

        if (pushed) {
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

            return "Submission pushed successfully!";
        } else {
            return "Failed to push submission.";
        }
    }



}
