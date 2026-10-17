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
        if (email != null) {
            email = email.trim().toLowerCase();
        }
        authmodel auth = authrepo.findByEmail(email);

        if (auth == null) {
            return new problemsmodel();
        }

        Long referenceId = auth.getId();

        return problemsrepo.findByReferenceid(referenceId)
                .orElseGet(() -> {
                    problemsmodel p = new problemsmodel();
                    p.setReferenceid(referenceId);
                    return problemsrepo.save(p);
                });
    }

    @PostMapping("/getcounts")
    public problemsmodel getproblemscount(@RequestBody Map<String, String> payload){
        String email = payload.get("email");
        if (email != null) {
            email = email.trim().toLowerCase();
        }
        authmodel user = authrepo.findByEmail(email);
        System.out.println(user);
        if (user == null) {
            return new problemsmodel();
        }

        Long refId = user.getId();

        // 🔍 Get problem stats using reference ID
        return problemsrepo.findByReferenceid(refId)
                .orElseGet(() -> {
                    problemsmodel p = new problemsmodel();
                    p.setReferenceid(refId);
                    return problemsrepo.save(p);
                });
    }

}
