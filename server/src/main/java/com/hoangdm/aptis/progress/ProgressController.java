package com.hoangdm.aptis.progress;

import com.hoangdm.aptis.security.AppUserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/progress")
public class ProgressController {
  private final LessonProgressRepository progress;
  private final WritingDraftRepository drafts;
  ProgressController(LessonProgressRepository progress, WritingDraftRepository drafts) { this.progress = progress; this.drafts = drafts; }
  public record LessonUpdate(@Min(1) int lastSlide, boolean completed) {}
  public record DraftUpdate(@NotBlank String lessonId, @NotBlank String sectionId, String content) {}
  public record ProgressView(String lessonId, int lastSlide, boolean completed, Instant updatedAt) {}
  public record DraftView(String content, Instant updatedAt) {}

  @GetMapping
  public List<ProgressView> list(@AuthenticationPrincipal AppUserPrincipal principal) {
    return progress.findAllByUserOrderByUpdatedAtDesc(principal.user()).stream().map(p -> new ProgressView(p.getLessonId(), p.getLastSlide(), p.isCompleted(), p.getUpdatedAt())).toList();
  }
  @PutMapping("/lessons/{lessonId}")
  @Transactional
  public ProgressView saveLesson(@PathVariable String lessonId, @RequestBody @Valid LessonUpdate update, @AuthenticationPrincipal AppUserPrincipal principal) {
    LessonProgress entry = progress.findByUserAndLessonId(principal.user(), lessonId).orElseGet(() -> new LessonProgress(principal.user(), lessonId));
    entry.update(update.lastSlide(), update.completed());
    progress.save(entry);
    return new ProgressView(entry.getLessonId(), entry.getLastSlide(), entry.isCompleted(), entry.getUpdatedAt());
  }
  @GetMapping("/drafts/{lessonId}/{sectionId}")
  public DraftView getDraft(@PathVariable String lessonId, @PathVariable String sectionId, @AuthenticationPrincipal AppUserPrincipal principal) {
    WritingDraft draft = drafts.findByUserAndLessonIdAndSectionId(principal.user(), lessonId, sectionId).orElse(new WritingDraft(principal.user(), lessonId, sectionId));
    return new DraftView(draft.getContent(), draft.getUpdatedAt());
  }
  @GetMapping("/drafts")
  public List<Map<String, Object>> listDrafts(@AuthenticationPrincipal AppUserPrincipal principal) {
    return drafts.findAllByUser(principal.user()).stream().map(d -> Map.<String, Object>of("lessonId", d.getLessonId(), "sectionId", d.getSectionId(), "content", d.getContent(), "updatedAt", d.getUpdatedAt())).toList();
  }
  @PutMapping("/drafts")
  @Transactional
  public DraftView saveDraft(@RequestBody @Valid DraftUpdate update, @AuthenticationPrincipal AppUserPrincipal principal) {
    WritingDraft draft = drafts.findByUserAndLessonIdAndSectionId(principal.user(), update.lessonId(), update.sectionId()).orElseGet(() -> new WritingDraft(principal.user(), update.lessonId(), update.sectionId()));
    draft.update(update.content() == null ? "" : update.content());
    drafts.save(draft);
    return new DraftView(draft.getContent(), draft.getUpdatedAt());
  }
}
