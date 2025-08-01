package com.example.Backend.Repositories;

import com.example.Backend.Models.authmodel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface Authrepo extends JpaRepository<authmodel,Long> {
    authmodel findByEmail(String email);
}
