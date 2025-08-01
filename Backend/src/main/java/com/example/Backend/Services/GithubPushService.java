package com.example.Backend.Services;

import com.example.Backend.Models.Submissionmodel;
import com.example.Backend.Models.authmodel;
import com.example.Backend.Repositories.Authrepo;
import com.example.Backend.Repositories.Submissionrepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class GithubPushService {
    @Autowired
    private Authrepo authrepo;
    public boolean pushToRepo(String email, String platform, String code, String summary) {
        // Mock GitHub push
        authmodel data=authrepo.findByEmail(email);

        if (data == null || data.getGithuburl() == null) {
            System.out.println("❌ Repo URL not found for email: " + email);
            return false;
        }

        String repourl = data.getGithuburl();

        System.out.println("Pushing to GitHub repo for user: " + email);
        System.out.println("Platform: " + platform);
        System.out.println("Code:\n" + code);
        System.out.println("Summary:\n" + summary);
        System.out.println("✅🤣🤣🤣"+repourl);

        // You can implement GitHub API push here using a personal access token and HTTP client
        return true;
    }
}
