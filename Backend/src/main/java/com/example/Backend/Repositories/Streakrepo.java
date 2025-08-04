package com.example.Backend.Repositories;

import com.example.Backend.Models.streakmodel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface Streakrepo extends JpaRepository<streakmodel, Long> {
    Optional<streakmodel> findByReferenceid(Long refId);
}
