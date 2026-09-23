package com.hoangdm.aptis.submission;

import com.hoangdm.aptis.security.AppUserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/progress/submissions")
public class SubmissionController {
  private final ExerciseSubmissionRepository submissions;

  SubmissionController(ExerciseSubmissionRepository submissions) { this.submissions = submissions; }

  public record SubmissionUpdate(
      @NotBlank String lessonId,
      @NotBlank String sectionId,
      String content,
      @Min(0) Integer score,
      @Min(0) Integer total) {}
  public record SubmissionView(
      String lessonId, String sectionId, String content, Integer score, Integer total, Instant submittedAt) {}

  @GetMapping
  public List<SubmissionView> list(@AuthenticationPrincipal AppUserPrincipal principal) {
    return submissions.findAllByUserOrderBySubmittedAtDesc(principal.user()).stream()
        .map(this::view).toList();
  }

  @PutMapping
  @Transactional
  public SubmissionView save(
      @RequestBody @Valid SubmissionUpdate update,
      @AuthenticationPrincipal AppUserPrincipal principal) {
    if (update.score() != null && update.total() != null && update.score() > update.total()) {
      throw new IllegalArgumentException("score cannot exceed total");
    }
    ExerciseSubmission entry = submissions
        .findByUserAndLessonIdAndSectionId(principal.user(), update.lessonId(), update.sectionId())
        .orElseGet(() -> new ExerciseSubmission(principal.user(), update.lessonId(), update.sectionId()));
    entry.update(update.content(), update.score(), update.total());
    submissions.save(entry);
    return view(entry);
  }

  private SubmissionView view(ExerciseSubmission submission) {
    return new SubmissionView(
        submission.getLessonId(), submission.getSectionId(), submission.getContent(),
        submission.getScore(), submission.getTotal(), submission.getSubmittedAt());
  }
}
