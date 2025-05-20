package org.quentingenet.vinylkeeper_back.repository;

import org.quentingenet.vinylkeeper_back.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUserUuid(UUID userUuid);
}