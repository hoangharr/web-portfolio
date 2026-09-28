package com.hoangdm.aptis.mock;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hoangdm.aptis.security.AppUserPrincipal;
import com.hoangdm.aptis.user.*;
import jakarta.servlet.http.Cookie;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:mocktests;MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "spring.datasource.username=sa", "spring.datasource.password=", "spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop", "debug=false", "logging.level.root=WARN"})
@AutoConfigureMockMvc
@Transactional
class MockAttemptControllerTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;
  @Autowired UserRepository users;
  MockHttpSession learner, other;
  String csrfHeader, csrf;
  Cookie csrfCookie;
  Long learnerId, otherId;
  @BeforeEach void setup() throws Exception {
    var firstUser = users.save(new AppUser(UUID.randomUUID()+"@example.com", "Learner", "unused", UserRole.LEARNER));
    var secondUser = users.save(new AppUser(UUID.randomUUID()+"@example.com", "Other", "unused", UserRole.LEARNER));
    learnerId = firstUser.getId(); otherId = secondUser.getId(); learner = session(firstUser); other = session(secondUser);
    var response = mvc.perform(get("/api/auth/csrf").session(learner)).andReturn().getResponse();
    csrfCookie = response.getCookie("XSRF-TOKEN");
    var token = mapper.readTree(response.getContentAsString());
    csrfHeader = token.get("headerName").asText(); csrf = token.get("token").asText();
  }
  MockHttpSession session(AppUser user) {
    var session = new MockHttpSession(); var principal = new AppUserPrincipal(user);
    session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, new SecurityContextImpl(UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities())));
    return session;
  }
  String body(long version, boolean submitted) throws Exception {
    return mapper.writeValueAsString(Map.of("userId", learnerId, "assessmentId", "aptis-general-mock-1", "version", version, "submitted", submitted, "state", Map.of("coreAnswers", Map.of("0", 2), "writing", Map.of("p2", "My writing response"))));
  }
  void create(UUID id) throws Exception {
    mvc.perform(put("/api/mock-attempts/"+id).session(learner).cookie(csrfCookie).header(csrfHeader, csrf).contentType(MediaType.APPLICATION_JSON).content(body(0, false))).andExpect(status().isOk());
  }
  @Test void persistsDraftAndRetakesWithoutReplacingHistory() throws Exception {
    UUID first = UUID.randomUUID(); create(first);
    mvc.perform(get("/api/mock-attempts").session(learner)).andExpect(status().isOk()).andExpect(jsonPath("$[0].state.coreAnswers.0").value(2)).andExpect(jsonPath("$[0].state.writing.p2").value("My writing response"));
    mvc.perform(put("/api/mock-attempts/"+first).session(learner).cookie(csrfCookie).header(csrfHeader, csrf).contentType(MediaType.APPLICATION_JSON).content(body(0,true))).andExpect(status().isOk()).andExpect(jsonPath("$.submitted").value(true)).andExpect(jsonPath("$.version").value(1));
    create(UUID.randomUUID());
    mvc.perform(get("/api/mock-attempts").session(learner)).andExpect(jsonPath("$.length()").value(2));
  }
  @Test void isolatesAccountsAndRequiresCsrf() throws Exception {
    UUID id = UUID.randomUUID(); create(id);
    mvc.perform(get("/api/mock-attempts").session(other)).andExpect(jsonPath("$.length()").value(0));
    var otherResponse = mvc.perform(get("/api/auth/csrf").session(other)).andReturn().getResponse();
    var token = mapper.readTree(otherResponse.getContentAsString());
    var otherBody = (com.fasterxml.jackson.databind.node.ObjectNode) mapper.readTree(body(0,false)); otherBody.put("userId", otherId);
    mvc.perform(put("/api/mock-attempts/"+id).session(other).cookie(otherResponse.getCookie("XSRF-TOKEN")).header(token.get("headerName").asText(),token.get("token").asText()).contentType(MediaType.APPLICATION_JSON).content(otherBody.toString())).andExpect(status().isNotFound());
    mvc.perform(put("/api/mock-attempts/"+UUID.randomUUID()).session(other).cookie(otherResponse.getCookie("XSRF-TOKEN")).header(token.get("headerName").asText(),token.get("token").asText()).contentType(MediaType.APPLICATION_JSON).content(body(0,false))).andExpect(status().isForbidden());
    mvc.perform(put("/api/mock-attempts/"+id).session(learner).contentType(MediaType.APPLICATION_JSON).content(body(0,false))).andExpect(status().isForbidden());
  }
  @Test void rejectsStaleDeviceUpdates() throws Exception {
    UUID id = UUID.randomUUID(); create(id);
    mvc.perform(put("/api/mock-attempts/"+id).session(learner).cookie(csrfCookie).header(csrfHeader, csrf).contentType(MediaType.APPLICATION_JSON).content(body(0,true))).andExpect(status().isOk());
    mvc.perform(put("/api/mock-attempts/"+id).session(learner).cookie(csrfCookie).header(csrfHeader, csrf).contentType(MediaType.APPLICATION_JSON).content(body(0,false))).andExpect(status().isConflict());
    mvc.perform(get("/api/mock-attempts").session(learner)).andExpect(jsonPath("$[0].submitted").value(true));
  }
  @Test void storesRecordingAndOnlyLetsItsOwnerPlayIt() throws Exception {
    UUID id = UUID.randomUUID(); create(id); byte[] clip = new byte[]{1,2,3,4};
    mvc.perform(put("/api/mock-attempts/"+id+"/speaking?version=0").session(learner).cookie(csrfCookie).header(csrfHeader, csrf).contentType("audio/mp4").content(clip)).andExpect(status().isOk()).andExpect(jsonPath("$.hasSpeaking").value(true));
    mvc.perform(get("/api/mock-attempts/"+id+"/speaking").session(learner)).andExpect(status().isOk()).andExpect(content().bytes(clip)).andExpect(header().string("Cache-Control", "no-store"));
    mvc.perform(get("/api/mock-attempts/"+id+"/speaking").session(other)).andExpect(status().isNotFound());
  }
}
