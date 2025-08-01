package com.example.Backend.Models;

import jakarta.persistence.*;

@Entity
@Table(name = "submissionmodel")
public class Submissionmodel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String email;  // to associate with the user
    private String platform; // e.g., "leetcode", "geeksforgeeks", "github"
    private int easyCount;
    private int mediumCount;
    private int hardCount;

    public void SolvedQuestionStats() {}

    public void SolvedQuestionStats(String email, String platform) {
        this.email = email;
        this.platform = platform;
    }

    // --- Getters and Setters ---

    public Long getId() { return id; }

    public String getEmail() { return email; }

    public void setEmail(String email) { this.email = email; }

    public String getPlatform() { return platform; }

    public void setPlatform(String platform) { this.platform = platform; }

    public int getEasyCount() { return easyCount; }

    public void setEasyCount(int easyCount) { this.easyCount = easyCount; }

    public int getMediumCount() { return mediumCount; }

    public void setMediumCount(int mediumCount) { this.mediumCount = mediumCount; }

    public int getHardCount() { return hardCount; }

    public void setHardCount(int hardCount) { this.hardCount = hardCount; }
}
