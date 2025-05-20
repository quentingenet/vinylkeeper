package org.quentingenet.vinylkeeper_back.service;

import org.quentingenet.vinylkeeper_back.model.User;
import org.quentingenet.vinylkeeper_back.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
@Transactional
public class UserService implements UserDetailsService {
    
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
    }

    public User getUserByUuid(UUID userUuid) {
        return userRepository.findByUserUuid(userUuid)
            .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}