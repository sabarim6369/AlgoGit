package com.example.Backend.Dto;

public class SubmissionRequest {
    private String email;
    private String platform;
    private String code;
    private String repoUrl;
    private String title;
    private String language;
    private String difficulty;

    // Getters and setters
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getRepourl() {
        return repoUrl;
    }

    public void setRepourl(String repoUrl) {
        this.repoUrl = repoUrl;
    }
    public void settile(String title){
        this.title=title;
    }
    public String getTitle(){
        return title;
    }

    public String getlanguage() {
        return language;
    }

    public void getlanguage(String language) {
        this.language = language;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }
}
