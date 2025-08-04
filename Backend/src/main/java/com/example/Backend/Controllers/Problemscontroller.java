package com.example.Backend.Controllers;

import com.example.Backend.Models.authmodel;
import com.example.Backend.Models.problemsmodel;
import com.example.Backend.Repositories.Authrepo;
import com.example.Backend.Repositories.Problemsrepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/problems")
public class Problemscontroller {

    @Autowired
    private Authrepo authrepo;

    @Autowired
    private Problemsrepo problemsrepo;

    @PostMapping("/getproblems")
    public problemsmodel getProblemsByEmail(@RequestParam String email) {
        authmodel auth = authrepo.findByEmail(email);

        if (auth == null) {
            throw new RuntimeException("User not found for email: " + email);
        }

        Long referenceId = auth.getId();

        return problemsrepo.findByReferenceid(referenceId)
                .orElseThrow(() -> new RuntimeException("No problem stats found for user"));
    }
    @PostMapping("/getcounts")
    public problemsmodel getproblemscount(@RequestBody Map<String, String> payload){
        String email = payload.get("email");
        authmodel user = authrepo.findByEmail(email);
        System.out.println(user);
        if (user == null) {
            throw new RuntimeException("User not found for email: " + email);
        }

        Long refId = user.getId();

        // 🔍 Get problem stats using reference ID
        Optional<problemsmodel> statsOpt = problemsrepo.findByReferenceid(refId);
        return statsOpt.orElseThrow(() -> new RuntimeException("No stats found for this user"));

    }

}
