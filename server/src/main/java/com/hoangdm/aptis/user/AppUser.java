package com.hoangdm.aptis.user;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users")
public class AppUser {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @Column(nullable = false, unique = true) private String email;
  @Column(name = "display_name", nullable = false) private String displayName;
  @Column(name = "password_hash", nullable = false) private String passwordHash;
  @Enumerated(EnumType.STRING) @Column(nullable = false) private UserRole role = UserRole.LEARNER;
  @Column(nullable = false) private boolean enabled = true;
  @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
  protected AppUser() {}
  public AppUser(String email, String displayName, String passwordHash, UserRole role) { this.email = email; this.displayName = displayName; this.passwordHash = passwordHash; this.role = role; }
  public Long getId() { return id; }
  public String getEmail() { return email; }
  public String getDisplayName() { return displayName; }
  public String getPasswordHash() { return passwordHash; }
  public UserRole getRole() { return role; }
  public boolean isEnabled() { return enabled; }
}
