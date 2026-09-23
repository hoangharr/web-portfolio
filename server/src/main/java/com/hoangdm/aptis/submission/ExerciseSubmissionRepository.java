package com.hoangdm.aptis.submission;

import com.hoangdm.aptis.user.AppUser;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface ExerciseSubmissionRepository extends JpaRepository<ExerciseSubmission, Long> {
  List<ExerciseSubmission> findAllByUserOrderBySubmittedAtDesc(AppUser user);
  Optional<ExerciseSubmission> findByUserAndLessonIdAndSectionId(AppUser user, String lessonId, String sectionId);
}
