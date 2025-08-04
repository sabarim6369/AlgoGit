package com.example.Backend.Controllers;

import com.example.Backend.Models.authmodel;
import com.example.Backend.Models.streakmodel;
import com.example.Backend.Repositories.Authrepo;
import com.example.Backend.Repositories.Streakrepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/streak")
public class Streakcontroller {

    @Autowired
    private Authrepo authrepo;

    @Autowired
    private Streakrepo streakrepo;

    @PostMapping("/getstreak")
    public streakmodel getStreak(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");

        authmodel user = authrepo.findByEmail(email);
        if (user == null) {
            throw new RuntimeException("User not found for email: " + email);
        }

        Long refId = user.getId();

        return streakrepo.findByReferenceid(refId)
                .orElseThrow(() -> new RuntimeException("No streak found for this user"));
    }
}
