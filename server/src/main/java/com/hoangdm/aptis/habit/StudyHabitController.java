package com.hoangdm.aptis.habit;

import com.hoangdm.aptis.security.AppUserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** A deliberately small, privacy-preserving activity log used for a learner's own streak. */
@RestController
@RequestMapping("/api/habits")
public class StudyHabitController {
  private final JdbcTemplate jdbc;

  StudyHabitController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  public enum ActivityType { LESSON, MOCK, VOCABULARY }
  public record Activity(@NotNull ActivityType type) {}
  public record DayView(LocalDate date, int actions, boolean complete) {}
  public record Summary(int streak, int todayActions, int dailyGoal, List<DayView> days) {}

  @PostMapping("/activity")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void record(@RequestBody @Valid Activity activity, @AuthenticationPrincipal AppUserPrincipal principal) {
    String column = switch (activity.type()) {
      case LESSON -> "lesson_actions";
      case MOCK -> "mock_actions";
      case VOCABULARY -> "vocabulary_actions";
    };
    jdbc.update("insert into study_daily_activity (user_id, activity_date, " + column + ") values (?, current_date, 1) "
        + "on conflict (user_id, activity_date) do update set " + column + " = study_daily_activity." + column + " + 1",
        principal.user().getId());
  }

  @GetMapping("/summary")
  public Summary summary(@AuthenticationPrincipal AppUserPrincipal principal) {
    LocalDate today = LocalDate.now(ZoneOffset.UTC);
    List<DayView> days = jdbc.query(
        "select activity_date, lesson_actions + mock_actions + vocabulary_actions as actions "
            + "from study_daily_activity where user_id=? and activity_date >= current_date - 6 order by activity_date",
        (rs, row) -> new DayView(rs.getObject(1, LocalDate.class), rs.getInt(2), rs.getInt(2) > 0), principal.user().getId());
    List<LocalDate> activeDates = jdbc.queryForList(
        "select activity_date from study_daily_activity where user_id=? and lesson_actions + mock_actions + vocabulary_actions > 0",
        LocalDate.class, principal.user().getId());
    int streak = 0;
    for (LocalDate date = today; ; date = date.minusDays(1)) {
      if (!activeDates.contains(date)) break;
      streak++;
    }
    int todayActions = days.stream().filter(day -> day.date().equals(today)).mapToInt(DayView::actions).sum();
    return new Summary(streak, todayActions, 1, days);
  }
}
