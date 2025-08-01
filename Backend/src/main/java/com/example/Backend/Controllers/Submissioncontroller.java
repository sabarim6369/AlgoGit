package com.example.Backend.Controllers;

import com.example.Backend.Models.Submissionmodel;
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
import java.util.List;

@RestController
@RequestMapping("/submission")
public class Submissioncontroller {
    @Autowired
    private Submissionrepo submissionrepo;
    @Autowired
    private AiService aiService;
    @Autowired
    private GithubPushService githubPushService;
    @PostMapping("/submit")
    public String submit(@RequestBody SubmissionRequest  request){
        String code = request.getCode();
        String platform = request.getPlatform();
        String email = request.getEmail();
//        String repoUrl=request.getRepourl();
        System.out.println("✅✅✅"+request);
        String summary = aiService.summarizeSolution(code);
        boolean pushed = githubPushService.pushToRepo(email, platform, code, summary);

        if (pushed) {
            return "Submission pushed successfully!";
        } else {
            return "Failed to push submission.";
        }

    }

}
