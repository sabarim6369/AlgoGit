package com.example.Backend.Controllers;

import com.example.Backend.Models.authmodel;
import com.example.Backend.Repositories.Authrepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class Authcontroller {
    @Autowired
    private Authrepo authRepository;

    @PostMapping("/register")
    //Not used.Register is done in exchange endpoint below.😐😐😐😐
    public authmodel registerUser(@RequestBody authmodel user) {
        List<authmodel> existingUsers = authRepository.findAllByEmail(user.getEmail());
System.out.println(existingUsers+"🙏🙏🙏🙏🙏");
        if (!existingUsers.isEmpty()) {
            System.out.println("😍😍😍😍");
            authmodel existingUser = existingUsers.get(0); // use the first match
            existingUser.setGithubAccessToken(user.getGithubAccessToken());
            existingUser.setGithuburl(user.getGithuburl());
            existingUser.setName(user.getName());
            return authRepository.save(existingUser); // update and return
        }

        // New user – save normally
        return authRepository.save(user);
    }

    @PostMapping("/update-url")
    public ResponseEntity<String> updateGithubUrl(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String githuburl = payload.get("githuburl");

        if (email == null || githuburl == null) {
            return ResponseEntity.badRequest().body("❌ Email and GitHub URL are required.");
        }

        authmodel user = authRepository.findByEmail(email);
        if (user != null) {
            user.setGithuburl(githuburl);
            authRepository.save(user);  // ✅ Save to database
            return ResponseEntity.ok("✅ GitHub URL updated successfully.");
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("❌ User not found.");
        }
    }



    @GetMapping("/all")
    public List<authmodel> getAllUsers() {
        return authRepository.findAll();
    }
    @PostMapping("/github/exchange-code")
    public ResponseEntity<?> exchangeGithubCode(@RequestBody Map<String, String> payload) {
        System.out.println("✅ Incoming GitHub OAuth payload");

        String code = payload.get("code");
        String email = payload.get("email").trim().toLowerCase(); // Normalize
        String name = payload.get("name");
        String githubUrl = payload.get("githuburl");

        // Step 1: Exchange code for access token
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("client_id", "Ov23liMfOlf2emj68SBT");
        body.add("client_secret", "71b64109d07c30fc1732af87248900b51d4c527f");
        body.add("code", code);
        body.add("redirect_uri", "https://cdlhoniahlpalcemeddmkmloeiejomie.chromiumapp.org/");

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(
                "https://github.com/login/oauth/access_token",
                request,
                Map.class
        );

        Map<String, Object> responseBody = response.getBody();
        String accessToken = (String) responseBody.get("access_token");

        // Step 2: Check if user already exists
        authmodel user = authRepository.findByEmail(email);
        if (user != null) {
            // Update existing user
            user.setGithubAccessToken(accessToken);
            user.setGithuburl(githubUrl);
            user.setName(name);
            authRepository.save(user);
            System.out.println("✅ Updated existing user: " + user);
        } else {
            // Create new user
            user = new authmodel();
            user.setEmail(email);
            user.setName(name);
            user.setGithuburl(githubUrl);
            user.setGithubAccessToken(accessToken);
            authRepository.save(user);
            System.out.println("✅ Created new user: " + user);
        }

        // Return access token and user info
        responseBody.put("email", email);
        responseBody.put("name", name);
        responseBody.put("githuburl", githubUrl);

        return ResponseEntity.ok(responseBody);
    }

}
