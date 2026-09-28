package com.hoangdm.aptis.mock;

import com.hoangdm.aptis.user.AppUser;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "mock_attempts")
public class MockAttempt {
  @Id private UUID id;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) private AppUser user;
  @Column(name = "assessment_id", nullable = false, length = 120) private String assessmentId;
  @Column(nullable = false, columnDefinition = "text") private String state;
  @Column(nullable = false) private boolean submitted;
  @Version private Long version;
  @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
  @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();
  @Basic(fetch = FetchType.LAZY) @Column(name = "speaking_audio", columnDefinition = "bytea") private byte[] speakingAudio;
  @Column(name = "speaking_mime", length = 100) private String speakingMime;

  protected MockAttempt() {}
  MockAttempt(UUID id, AppUser user, String assessmentId) { this.id = id; this.user = user; this.assessmentId = assessmentId; }
  void update(String state, boolean submitted) { this.state = state; this.submitted = submitted; this.updatedAt = Instant.now(); }
  void record(byte[] audio, String mime) { this.speakingAudio = audio; this.speakingMime = mime; this.updatedAt = Instant.now(); }
  public UUID getId() { return id; }
  public AppUser getUser() { return user; }
  public String getAssessmentId() { return assessmentId; }
  public String getState() { return state; }
  public boolean isSubmitted() { return submitted; }
  public long getVersion() { return version == null ? 0 : version; }
  public Instant getUpdatedAt() { return updatedAt; }
  public Instant getCreatedAt() { return createdAt; }
  public byte[] getSpeakingAudio() { return speakingAudio; }
  public String getSpeakingMime() { return speakingMime; }
  public boolean hasSpeaking() { return speakingAudio != null && speakingAudio.length > 0; }
}
