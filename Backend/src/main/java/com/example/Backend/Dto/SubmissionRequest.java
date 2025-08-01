package com.example.Backend.Dto;

public class SubmissionRequest {
    private String email;
    private String platform;
    private String code;

    // Getters and setters
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}
