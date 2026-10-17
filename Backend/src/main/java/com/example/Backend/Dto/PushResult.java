package com.example.Backend.Dto;

public class PushResult {
    private boolean success;
    private String folderName;
    private String filePath;
    private String githubUrl;
    private String fileUrl;
    private String concept;

    public PushResult() {
    }

    public PushResult(boolean success) {
        this.success = success;
    }

    public PushResult(boolean success, String folderName, String filePath, String githubUrl, String fileUrl, String concept) {
        this.success = success;
        this.folderName = folderName;
        this.filePath = filePath;
        this.githubUrl = githubUrl;
        this.fileUrl = fileUrl;
        this.concept = concept;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getFolderName() {
        return folderName;
    }

    public void setFolderName(String folderName) {
        this.folderName = folderName;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public String getGithubUrl() {
        return githubUrl;
    }

    public void setGithubUrl(String githubUrl) {
        this.githubUrl = githubUrl;
    }

    public String getFileUrl() {
        return fileUrl;
    }

    public void setFileUrl(String fileUrl) {
        this.fileUrl = fileUrl;
    }

    public String getConcept() {
        return concept;
    }

    public void setConcept(String concept) {
        this.concept = concept;
    }
}
