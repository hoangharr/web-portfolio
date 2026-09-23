package com.hoangdm.aptis.submission;

import com.hoangdm.aptis.user.AppUser;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "exercise_submissions", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "lesson_id", "section_id"}))
public class ExerciseSubmission {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) private AppUser user;
  @Column(name = "lesson_id", nullable = false) private String lessonId;
  @Column(name = "section_id", nullable = false) private String sectionId;
  @Column(columnDefinition = "text", nullable = false) private String content = "";
  private Integer score;
  private Integer total;
  @Column(name = "submitted_at", nullable = false) private Instant submittedAt = Instant.now();

  protected ExerciseSubmission() {}
  public ExerciseSubmission(AppUser user, String lessonId, String sectionId) {
    this.user = user; this.lessonId = lessonId; this.sectionId = sectionId;
  }
  public void update(String content, Integer score, Integer total) {
    this.content = content == null ? "" : content;
    this.score = score;
    this.total = total;
    this.submittedAt = Instant.now();
  }
  public String getLessonId() { return lessonId; }
  public String getSectionId() { return sectionId; }
  public String getContent() { return content; }
  public Integer getScore() { return score; }
  public Integer getTotal() { return total; }
  public Instant getSubmittedAt() { return submittedAt; }
}
