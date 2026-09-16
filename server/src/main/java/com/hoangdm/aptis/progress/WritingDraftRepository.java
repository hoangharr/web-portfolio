package com.hoangdm.aptis.progress;

import com.hoangdm.aptis.user.AppUser;
import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface WritingDraftRepository extends JpaRepository<WritingDraft, Long> {
  Optional<WritingDraft> findByUserAndLessonIdAndSectionId(AppUser user, String lessonId, String sectionId);
  List<WritingDraft> findAllByUser(AppUser user);
}
