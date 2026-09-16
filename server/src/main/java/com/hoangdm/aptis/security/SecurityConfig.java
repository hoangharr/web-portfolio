package com.hoangdm.aptis.security;

import com.hoangdm.aptis.user.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

@Configuration
public class SecurityConfig {
  @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
  @Bean AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception { return configuration.getAuthenticationManager(); }

  @Bean
  SecurityFilterChain filterChain(HttpSecurity http, UserRepository users) throws Exception {
    http
      .csrf(csrf -> csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()))
      .authorizeHttpRequests(auth -> auth
        .requestMatchers("/actuator/health", "/api/auth/login", "/api/auth/csrf").permitAll()
        .requestMatchers("/api/admin/**").hasRole("ADMIN")
        .requestMatchers("/api/teacher/**").hasAnyRole("TEACHER", "ADMIN")
        .requestMatchers("/api/**").authenticated()
        .anyRequest().permitAll())
      .userDetailsService(email -> new AppUserPrincipal(users.findByEmailIgnoreCase(email)
        .orElseThrow(() -> new org.springframework.security.core.userdetails.UsernameNotFoundException(email))))
      .formLogin(form -> form.disable())
      .httpBasic(Customizer.withDefaults());
    return http.build();
  }
}
