package com.example.Backend.Repositories;

import com.example.Backend.Models.problemsmodel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface Problemsrepo extends JpaRepository<problemsmodel,Long> {
    Optional<problemsmodel> findByReferenceid(Long referenceid);
}
