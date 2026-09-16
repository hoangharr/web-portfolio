package com.hoangdm.aptis.user;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {
  private final UserRepository users;
  private final PasswordEncoder passwords;
  AdminUserController(UserRepository users, PasswordEncoder passwords) { this.users = users; this.passwords = passwords; }
  public record CreateUserRequest(@Email @NotBlank String email, @NotBlank String displayName, @NotBlank String temporaryPassword, UserRole role) {}

  @GetMapping
  public List<Map<String, Object>> list() {
    return users.findAll().stream().map(user -> Map.<String, Object>of("id", user.getId(), "email", user.getEmail(), "displayName", user.getDisplayName(), "role", user.getRole().name(), "enabled", user.isEnabled())).toList();
  }
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> create(@RequestBody @Valid CreateUserRequest request) {
    String email = request.email().trim().toLowerCase();
    if (users.findByEmailIgnoreCase(email).isPresent()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
    UserRole role = request.role() == null ? UserRole.LEARNER : request.role();
    if (role == UserRole.ADMIN) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Create administrators through the server bootstrap flow");
    AppUser user = users.save(new AppUser(email, request.displayName().trim(), passwords.encode(request.temporaryPassword()), role));
    return Map.of("id", user.getId(), "email", user.getEmail(), "displayName", user.getDisplayName(), "role", user.getRole().name());
  }
}
