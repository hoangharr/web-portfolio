package com.hoangdm.aptis.security;

import com.hoangdm.aptis.user.AppUser;
import com.hoangdm.aptis.user.UserRepository;
import com.hoangdm.aptis.user.UserRole;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
class AdminBootstrap {
  @Bean CommandLineRunner bootstrapAdmin(UserRepository users, PasswordEncoder encoder,
      @Value("${aptis.bootstrap-admin.email:}") String email,
      @Value("${aptis.bootstrap-admin.password:}") String password) {
    return args -> { if (!email.isBlank() && !password.isBlank() && users.findByEmailIgnoreCase(email).isEmpty()) users.save(new AppUser(email.toLowerCase(), "Administrator", encoder.encode(password), UserRole.ADMIN)); };
  }
}
