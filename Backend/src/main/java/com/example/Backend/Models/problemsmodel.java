package com.example.Backend.Models;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class problemsmodel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long referenceid;
    private int Leetcodecount;
    private int Gfgcount;
    private int hackerrankcount;
    private int codechefcount;
    private int leetcodeEasy;
    private int leetcodeMedium;
    private int leetcodeHard;

    // GFG
    private int gfgEasy;
    private int gfgMedium;
    private int gfgHard;

    // CodeChef
    private int codechefEasy;
    private int codechefMedium;
    private int codechefHard;

    // HackerRank
    private int hackerrankEasy;
    private int hackerrankMedium;
    private int hackerrankHard;

    public Long getId() {
        return id;
    }

    public Long getReferenceid() {
        return referenceid;
    }

    public void setReferenceid(Long referenceid) {
        this.referenceid = referenceid;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public int getLeetcodecount() {
        return Leetcodecount;
    }

    public void setLeetcodecount(int leetcodecount) {
        Leetcodecount = leetcodecount;
    }

    public int getGfgcount() {
        return Gfgcount;
    }

    public void setGfgcount(int gfgcount) {
        Gfgcount = gfgcount;
    }

    public int getHackerrankcount() {
        return hackerrankcount;
    }

    public void setHackerrankcount(int hackerrankcount) {
        this.hackerrankcount = hackerrankcount;
    }

    public int getCodechefcount() {
        return codechefcount;
    }

    public void setCodechefcount(int codechefcount) {
        this.codechefcount = codechefcount;
    }

    public int getLeetcodeEasy() {
        return leetcodeEasy;
    }

    public void setLeetcodeEasy(int leetcodeEasy) {
        this.leetcodeEasy = leetcodeEasy;
    }

    public int getHackerrankHard() {
        return hackerrankHard;
    }

    public void setHackerrankHard(int hackerrankHard) {
        this.hackerrankHard = hackerrankHard;
    }

    public int getHackerrankEasy() {
        return hackerrankEasy;
    }

    public void setHackerrankEasy(int hackerrankEasy) {
        this.hackerrankEasy = hackerrankEasy;
    }

    public int getHackerrankMedium() {
        return hackerrankMedium;
    }

    public void setHackerrankMedium(int hackerrankMedium) {
        this.hackerrankMedium = hackerrankMedium;
    }

    public int getCodechefHard() {
        return codechefHard;
    }

    public void setCodechefHard(int codechefHard) {
        this.codechefHard = codechefHard;
    }

    public int getCodechefEasy() {
        return codechefEasy;
    }

    public void setCodechefEasy(int codechefEasy) {
        this.codechefEasy = codechefEasy;
    }

    public int getCodechefMedium() {
        return codechefMedium;
    }

    public void setCodechefMedium(int codechefMedium) {
        this.codechefMedium = codechefMedium;
    }

    public int getGfgHard() {
        return gfgHard;
    }

    public void setGfgHard(int gfgHard) {
        this.gfgHard = gfgHard;
    }

    public int getGfgEasy() {
        return gfgEasy;
    }

    public void setGfgEasy(int gfgEasy) {
        this.gfgEasy = gfgEasy;
    }

    public int getGfgMedium() {
        return gfgMedium;
    }

    public void setGfgMedium(int gfgMedium) {
        this.gfgMedium = gfgMedium;
    }

    public int getLeetcodeMedium() {
        return leetcodeMedium;
    }

    public void setLeetcodeMedium(int leetcodeMedium) {
        this.leetcodeMedium = leetcodeMedium;
    }

    public int getLeetcodeHard() {
        return leetcodeHard;
    }

    public void setLeetcodeHard(int leetcodeHard) {
        this.leetcodeHard = leetcodeHard;
    }
}
