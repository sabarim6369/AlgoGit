package com.example.Backend.Controllers;

import com.example.Backend.Models.authmodel;
import com.example.Backend.Repositories.Authrepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
}
