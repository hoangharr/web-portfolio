package com.hoangdm.aptis.security;

import com.hoangdm.aptis.user.AppUser;
import com.hoangdm.aptis.user.UserRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
public class RememberDeviceService {
  private static final String COOKIE_NAME = "APTIS_REMEMBER_DEVICE";
  private final JdbcTemplate jdbc;
  private final UserRepository users;
  private final int days;
  private final boolean secureCookie;
  private final SecureRandom random = new SecureRandom();

  public RememberDeviceService(JdbcTemplate jdbc, UserRepository users, @Value("${aptis.remember-device.days:30}") int days,
      @Value("${aptis.remember-device.secure-cookie:false}") boolean secureCookie) {
    this.jdbc = jdbc; this.users = users; this.days = days; this.secureCookie = secureCookie;
  }

  public void issue(AppUser user, HttpServletResponse response) {
    String selector = randomValue(18);
    String validator = randomValue(32);
    jdbc.update("insert into remember_device_tokens (selector, user_id, validator_hash, expires_at) values (?, ?, ?, ?)", selector, user.getId(), hash(validator), OffsetDateTime.now().plusDays(days));
    writeCookie(response, selector + "." + validator, Duration.ofDays(days));
  }

  public Optional<Authentication> restore(HttpServletRequest request, HttpServletResponse response) {
    String value = cookieValue(request);
    if (value == null || !value.contains(".")) return Optional.empty();
    String[] parts = value.split("\\.", 2);
    List<Map<String, Object>> rows = jdbc.queryForList("select user_id, validator_hash from remember_device_tokens where selector = ? and expires_at > current_timestamp", parts[0]);
    if (rows.size() != 1 || !MessageDigest.isEqual(hash(parts[1]).getBytes(StandardCharsets.UTF_8), ((String) rows.getFirst().get("validator_hash")).getBytes(StandardCharsets.UTF_8))) { revoke(request, response); return Optional.empty(); }
    long userId = ((Number) rows.getFirst().get("user_id")).longValue();
    Optional<AppUser> user = users.findById(userId).filter(AppUser::isEnabled);
    if (user.isEmpty()) { revoke(request, response); return Optional.empty(); }
    String validator = randomValue(32);
    jdbc.update("update remember_device_tokens set validator_hash = ?, expires_at = ?, last_used_at = current_timestamp where selector = ?", hash(validator), OffsetDateTime.now().plusDays(days), parts[0]);
    writeCookie(response, parts[0] + "." + validator, Duration.ofDays(days));
    AppUserPrincipal principal = new AppUserPrincipal(user.get());
    return Optional.of(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
  }

  public void revoke(HttpServletRequest request, HttpServletResponse response) { String value = cookieValue(request); if (value != null && value.contains(".")) jdbc.update("delete from remember_device_tokens where selector = ?", value.split("\\.", 2)[0]); writeCookie(response, "", Duration.ZERO); }
  private String cookieValue(HttpServletRequest request) { if (request.getCookies() == null) return null; for (Cookie cookie : request.getCookies()) if (COOKIE_NAME.equals(cookie.getName())) return cookie.getValue(); return null; }
  private void writeCookie(HttpServletResponse response, String value, Duration maxAge) { response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from(COOKIE_NAME, value).httpOnly(true).secure(secureCookie).sameSite("Lax").path("/").maxAge(maxAge).build().toString()); }
  private String randomValue(int bytes) { byte[] value = new byte[bytes]; random.nextBytes(value); return Base64.getUrlEncoder().withoutPadding().encodeToString(value); }
  private String hash(String value) { try { return Base64.getUrlEncoder().withoutPadding().encodeToString(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); } catch (Exception exception) { throw new IllegalStateException(exception); } }
}
