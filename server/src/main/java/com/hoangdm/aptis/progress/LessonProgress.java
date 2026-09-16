package com.hoangdm.aptis.progress;

import com.hoangdm.aptis.user.AppUser;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "lesson_progress", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "lesson_id"}))
public class LessonProgress {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) private AppUser user;
  @Column(name = "lesson_id", nullable = false) private String lessonId;
  @Column(name = "last_slide", nullable = false) private int lastSlide = 1;
  @Column(nullable = false) private boolean completed;
  @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();
  protected LessonProgress() {}
  public LessonProgress(AppUser user, String lessonId) { this.user = user; this.lessonId = lessonId; }
  public void update(int lastSlide, boolean completed) { this.lastSlide = lastSlide; this.completed = completed; this.updatedAt = Instant.now(); }
  public String getLessonId() { return lessonId; }
  public int getLastSlide() { return lastSlide; }
  public boolean isCompleted() { return completed; }
  public Instant getUpdatedAt() { return updatedAt; }
}
