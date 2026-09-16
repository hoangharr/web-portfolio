package com.hoangdm.aptis.auth;

import com.hoangdm.aptis.security.AppUserPrincipal;
import com.hoangdm.aptis.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthenticationManager authenticationManager;
  public AuthController(AuthenticationManager authenticationManager) { this.authenticationManager = authenticationManager; }
  public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}

  @GetMapping("/csrf")
  public Map<String, String> csrf(CsrfToken token) { return Map.of("headerName", token.getHeaderName(), "token", token.getToken()); }

  @PostMapping("/login")
  public Map<String, Object> login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
    Authentication authentication = authenticationManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(request.email(), request.password()));
    SecurityContextHolder.getContext().setAuthentication(authentication);
    httpRequest.getSession(true).setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, SecurityContextHolder.getContext());
    return profile(authentication);
  }
  @GetMapping("/me")
  public Map<String, Object> me(Authentication authentication) { return profile(authentication); }
  @PostMapping("/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void logout(HttpServletRequest request, HttpServletResponse response) { if (request.getSession(false) != null) request.getSession(false).invalidate(); SecurityContextHolder.clearContext(); }
  private Map<String, Object> profile(Authentication authentication) {
    AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
    return Map.of("id", principal.user().getId(), "email", principal.user().getEmail(), "displayName", principal.user().getDisplayName(), "role", principal.user().getRole().name());
  }
}
