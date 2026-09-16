package com.hoangdm.aptis.progress;

import com.hoangdm.aptis.user.AppUser;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface LessonProgressRepository extends JpaRepository<LessonProgress, Long> {
  List<LessonProgress> findAllByUserOrderByUpdatedAtDesc(AppUser user);
  Optional<LessonProgress> findByUserAndLessonId(AppUser user, String lessonId);
}
