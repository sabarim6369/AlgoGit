package com.example.Backend.Repositories;

import com.example.Backend.Models.SubmissionRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubmissionRecordRepo extends JpaRepository<SubmissionRecord, Long> {
    List<SubmissionRecord> findTop20ByEmailOrderBySubmittedAtDesc(String email);
}
