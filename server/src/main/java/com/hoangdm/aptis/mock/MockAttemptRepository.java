package com.hoangdm.aptis.mock;

import com.hoangdm.aptis.user.AppUser;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MockAttemptRepository extends JpaRepository<MockAttempt, UUID> {
  interface Summary {
    UUID getId(); String getAssessmentId(); String getState(); boolean isSubmitted();
    long getVersion(); String getSpeakingMime(); Instant getCreatedAt(); Instant getUpdatedAt();
  }
  @Query("select a.id as id, a.assessmentId as assessmentId, a.state as state, a.submitted as submitted, a.version as version, a.speakingMime as speakingMime, a.createdAt as createdAt, a.updatedAt as updatedAt from MockAttempt a where a.user = :user order by a.updatedAt desc")
  List<Summary> summaries(@Param("user") AppUser user);
  Optional<MockAttempt> findByIdAndUser(UUID id, AppUser user);
}
