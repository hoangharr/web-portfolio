package com.hoangdm.aptis.security;

import com.hoangdm.aptis.user.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {
  @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
  @Bean AuthenticationManager authenticationManager(UserRepository users, PasswordEncoder encoder) {
    DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
    provider.setUserDetailsService(email -> new AppUserPrincipal(users.findByEmailIgnoreCase(email)
      .orElseThrow(() -> new org.springframework.security.core.userdetails.UsernameNotFoundException(email))));
    provider.setPasswordEncoder(encoder);
    return new ProviderManager(provider);
  }

  @Bean
  SecurityFilterChain filterChain(HttpSecurity http, UserRepository users, RememberDeviceAuthenticationFilter rememberDeviceFilter) throws Exception {
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
      .addFilterBefore(rememberDeviceFilter, UsernamePasswordAuthenticationFilter.class)
      .formLogin(form -> form.disable());
    return http.build();
  }
}
