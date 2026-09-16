package com.hoangdm.aptis.progress;

import com.hoangdm.aptis.user.AppUser;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "writing_drafts", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "lesson_id", "section_id"}))
public class WritingDraft {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) private AppUser user;
  @Column(name = "lesson_id", nullable = false) private String lessonId;
  @Column(name = "section_id", nullable = false) private String sectionId;
  @Column(columnDefinition = "text", nullable = false) private String content = "";
  @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();
  protected WritingDraft() {}
  public WritingDraft(AppUser user, String lessonId, String sectionId) { this.user = user; this.lessonId = lessonId; this.sectionId = sectionId; }
  public void update(String content) { this.content = content; this.updatedAt = Instant.now(); }
  public String getContent() { return content; }
  public String getLessonId() { return lessonId; }
  public String getSectionId() { return sectionId; }
  public Instant getUpdatedAt() { return updatedAt; }
}
