package com.example.Backend.Controllers;

import com.example.Backend.Models.authmodel;
import com.example.Backend.Repositories.Authrepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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

    // Register user
    @PostMapping("/register")
    public authmodel registerUser(@RequestBody authmodel user) {
        return authRepository.save(user);
    }

    // Get all users
    @GetMapping("/all")
    public List<authmodel> getAllUsers() {
        return authRepository.findAll();
    }
    @PostMapping("/github/exchange-code")
    public ResponseEntity<?> exchangeGithubCode(@RequestBody Map<String, String> payload) {
        System.out.println("✅ Incoming GitHub OAuth payload");

        String code = payload.get("code");
        String email = payload.get("email");
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

        // Step 2: Directly save user into DB
        authmodel newUser = new authmodel();
        newUser.setEmail(email);
        newUser.setName(name);
        newUser.setGithuburl(githubUrl);
        newUser.setGithubAccessToken(accessToken);

        authmodel savedUser = authRepository.save(newUser);
        System.out.println("✅ Saved user: " + savedUser);

        // Return access token and user info
        responseBody.put("email", email);
        responseBody.put("name", name);
        responseBody.put("githuburl", githubUrl);

        return ResponseEntity.ok(responseBody);
    }

}
