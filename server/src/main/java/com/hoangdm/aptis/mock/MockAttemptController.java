package com.hoangdm.aptis.mock;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hoangdm.aptis.security.AppUserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/mock-attempts")
public class MockAttemptController {
  private final MockAttemptRepository attempts;
  private final ObjectMapper mapper;
  private static final int MAX_AUDIO = 15 * 1024 * 1024;
  private static final Set<String> AUDIO_TYPES = Set.of("audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/mpeg");
  MockAttemptController(MockAttemptRepository attempts, ObjectMapper mapper) { this.attempts = attempts; this.mapper = mapper; }
  public record Update(@NotNull Long userId, @Pattern(regexp = "aptis-general-mock-([1-9]|10)") @NotNull String assessmentId, @NotNull JsonNode state, boolean submitted, @Min(0) long version) {}
  public record View(UUID id, String assessmentId, JsonNode state, boolean submitted, long version, boolean hasSpeaking, Instant createdAt, Instant updatedAt) {}
  @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
  @ResponseStatus(HttpStatus.CONFLICT)
  public void concurrentUpdate() {}

  @GetMapping
  @Transactional(readOnly = true)
  public List<View> list(@AuthenticationPrincipal AppUserPrincipal principal) {
    return attempts.summaries(principal.user()).stream().map(attempt -> {
      try { return new View(attempt.getId(), attempt.getAssessmentId(), mapper.readTree(attempt.getState()), attempt.isSubmitted(), attempt.getVersion(), attempt.getSpeakingMime() != null, attempt.getCreatedAt(), attempt.getUpdatedAt()); }
      catch (IOException exception) { throw new IllegalStateException("Invalid persisted attempt", exception); }
    }).toList();
  }
  @PutMapping("/{id}")
  @Transactional
  public View save(@PathVariable UUID id, @RequestBody @Valid Update update, @AuthenticationPrincipal AppUserPrincipal principal) {
    if (!principal.user().getId().equals(update.userId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account changed; reload before saving");
    if (!update.state().isObject() || update.state().toString().length() > 300_000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid attempt state");
    MockAttempt entry = attempts.findByIdAndUser(id, principal.user()).orElseGet(() -> {
      if (attempts.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
      if (update.version() != 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "Attempt no longer exists");
      return new MockAttempt(id, principal.user(), update.assessmentId());
    });
    if (!entry.getAssessmentId().equals(update.assessmentId())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assessment cannot change");
    if (entry.getVersion() != update.version()) throw new ResponseStatusException(HttpStatus.CONFLICT, "This attempt was updated on another device");
    if (entry.isSubmitted() && !update.submitted()) throw new ResponseStatusException(HttpStatus.CONFLICT, "A submitted attempt cannot become a draft");
    entry.update(update.state().toString(), update.submitted());
    return view(attempts.saveAndFlush(entry));
  }
  @PutMapping("/{id}/speaking")
  @Transactional
  public View audio(@PathVariable UUID id, @RequestParam @Min(0) long version, HttpServletRequest request, @AuthenticationPrincipal AppUserPrincipal principal) throws IOException {
    MockAttempt entry = owned(id, principal);
    if (entry.getVersion() != version) throw new ResponseStatusException(HttpStatus.CONFLICT, "This attempt was updated on another device");
    String mime = request.getContentType() == null ? "" : request.getContentType().split(";")[0].trim().toLowerCase();
    if (!AUDIO_TYPES.contains(mime)) throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    byte[] bytes = request.getInputStream().readNBytes(MAX_AUDIO + 1);
    if (bytes.length == 0 || bytes.length > MAX_AUDIO) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Recording must be between 1 byte and 15 MB");
    entry.record(bytes, mime);
    return view(attempts.saveAndFlush(entry));
  }
  @GetMapping("/{id}/speaking")
  @Transactional(readOnly = true)
  public ResponseEntity<byte[]> audio(@PathVariable UUID id, @AuthenticationPrincipal AppUserPrincipal principal) {
    MockAttempt entry = owned(id, principal);
    if (!entry.hasSpeaking()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    return ResponseEntity.ok().contentType(MediaType.parseMediaType(entry.getSpeakingMime())).cacheControl(CacheControl.noStore()).header("X-Content-Type-Options", "nosniff").body(entry.getSpeakingAudio());
  }
  private MockAttempt owned(UUID id, AppUserPrincipal principal) { return attempts.findByIdAndUser(id, principal.user()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND)); }
  private View view(MockAttempt attempt) {
    try { return new View(attempt.getId(), attempt.getAssessmentId(), mapper.readTree(attempt.getState()), attempt.isSubmitted(), attempt.getVersion(), attempt.hasSpeaking(), attempt.getCreatedAt(), attempt.getUpdatedAt()); }
    catch (IOException exception) { throw new IllegalStateException("Invalid persisted attempt", exception); }
  }
}
