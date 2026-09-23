package com.hoangdm.aptis.vocabulary;

import com.fasterxml.jackson.databind.JsonNode;
import com.hoangdm.aptis.security.AppUserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/vocabulary")
public class VocabularyNotebookController {
  private final JdbcTemplate jdbc;
  private final RestClient spelling = RestClient.builder().baseUrl("https://api.datamuse.com").build();
  private final RestClient translator = RestClient.builder().baseUrl("https://api.mymemory.translated.net/get").build();

  VocabularyNotebookController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  public record SaveWord(@NotBlank @Pattern(regexp = "(?i)[a-z]+(?:['-][a-z]+)*") String word) {}
  public record ManualWord(@NotBlank @Size(max = 100) String word, @Size(max = 255) String phonetic, @Size(max = 1000) String vietnameseMeaning, @Size(max = 2000) String example) {}
  public record UpdateWord(String vietnameseMeaning, String example) {}
  public record PinUpdate(boolean pinned) {}
  public record LookupView(String word, String phonetic) {}
  public record WordView(String word, String phonetic, String definition, String vietnameseMeaning, String example, String customExample, Instant createdAt, boolean pinned) {}
  private record Lookup(String phonetic, String definition, String vietnameseMeaning) {}

  @GetMapping
  public List<WordView> list(@AuthenticationPrincipal AppUserPrincipal principal) {
    return jdbc.query("select word, phonetic, definition, vietnamese_meaning, example, custom_example, created_at, pinned from vocabulary_notebook where user_id = ? order by pinned desc, created_at desc", (rs, row) -> view(rs), principal.user().getId());
  }

  @GetMapping("/lookup")
  public LookupView lookupWord(@RequestParam @Pattern(regexp = "(?i)[a-z]+(?:['-][a-z]+)*") String word) {
    String normalized = word.trim().toLowerCase();
    String phonetic = quickPronunciation(normalized);
    if (phonetic == null) throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Spelling mistake");
    return new LookupView(normalized, phonetic);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public WordView save(@RequestBody @Valid SaveWord request, @AuthenticationPrincipal AppUserPrincipal principal) {
    String word = request.word().trim().toLowerCase();
    Lookup found = lookup(word);
    return jdbc.queryForObject("insert into vocabulary_notebook (user_id, word, phonetic, definition, vietnamese_meaning) values (?, ?, ?, ?, ?) on conflict (user_id, word) do update set phonetic=excluded.phonetic, definition=excluded.definition, vietnamese_meaning=coalesce(vocabulary_notebook.vietnamese_meaning, excluded.vietnamese_meaning) returning word, phonetic, definition, vietnamese_meaning, example, custom_example, created_at, pinned", (rs, row) -> view(rs), principal.user().getId(), word, found.phonetic(), found.definition(), found.vietnameseMeaning());
  }

  @PostMapping("/manual")
  @ResponseStatus(HttpStatus.CREATED)
  public WordView saveManual(@RequestBody @Valid ManualWord request, @AuthenticationPrincipal AppUserPrincipal principal) {
    String word = request.word().trim().toLowerCase();
    return jdbc.queryForObject("insert into vocabulary_notebook (user_id, word, phonetic, vietnamese_meaning, custom_example) values (?, ?, ?, ?, ?) on conflict (user_id, word) do update set phonetic=excluded.phonetic, vietnamese_meaning=excluded.vietnamese_meaning, custom_example=excluded.custom_example returning word, phonetic, definition, vietnamese_meaning, example, custom_example, created_at, pinned", (rs, row) -> view(rs), principal.user().getId(), word, clean(request.phonetic()), clean(request.vietnameseMeaning()), clean(request.example()));
  }

  @PutMapping("/{word}")
  public WordView update(@PathVariable String word, @RequestBody UpdateWord update, @AuthenticationPrincipal AppUserPrincipal principal) {
    return jdbc.queryForObject("update vocabulary_notebook set vietnamese_meaning=?, custom_example=? where user_id=? and word=? returning word, phonetic, definition, vietnamese_meaning, example, custom_example, created_at, pinned", (rs, row) -> view(rs), clean(update.vietnameseMeaning()), clean(update.example()), principal.user().getId(), word.toLowerCase());
  }

  @PutMapping("/{word}/pin")
  public WordView pin(@PathVariable String word, @RequestBody PinUpdate update, @AuthenticationPrincipal AppUserPrincipal principal) {
    return jdbc.queryForObject("update vocabulary_notebook set pinned=? where user_id=? and word=? returning word, phonetic, definition, vietnamese_meaning, example, custom_example, created_at, pinned", (rs, row) -> view(rs), update.pinned(), principal.user().getId(), word.toLowerCase());
  }

  @DeleteMapping("/{word}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable String word, @AuthenticationPrincipal AppUserPrincipal principal) { jdbc.update("delete from vocabulary_notebook where user_id=? and word=?", principal.user().getId(), word.toLowerCase()); }

  private String quickPronunciation(String word) {
    try {
      JsonNode words = spelling.get().uri(uri -> uri.path("/words").queryParam("sp", word).queryParam("md", "r").queryParam("max", 1).build()).retrieve().body(JsonNode.class);
      if (words == null || !words.isArray() || words.isEmpty() || !word.equalsIgnoreCase(text(words.get(0), "word"))) return null;
      for (JsonNode tag : words.get(0).path("tags")) {
        String value = tag.asText();
        if (value.startsWith("pron:")) return arpabetToIpa(value.substring(5));
      }
      return null;
    } catch (Exception ignored) { return null; }
  }

  private Lookup lookup(String word) {
    return new Lookup(quickPronunciation(word), null, translate(word));
  }

  private String translate(String word) {
    try { JsonNode result = translator.get().uri(uri -> uri.queryParam("q", word).queryParam("langpair", "en|vi").build()).retrieve().body(JsonNode.class); return result == null ? null : text(result.path("responseData"), "translatedText"); }
    catch (Exception ignored) { return null; }
  }

  private WordView view(ResultSet rs) throws SQLException { return new WordView(rs.getString(1), normalizePhonetic(rs.getString(2)), rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6), rs.getTimestamp(7).toInstant(), rs.getBoolean(8)); }
  private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
  private String text(JsonNode node, String field) { return node != null && node.hasNonNull(field) ? node.get(field).asText() : null; }

  private String normalizePhonetic(String phonetic) {
    if (phonetic == null || phonetic.isBlank()) return phonetic;
    String value = phonetic.trim();
    String unwrapped = value.startsWith("/") && value.endsWith("/") ? value.substring(1, value.length() - 1) : value;
    return unwrapped.matches("[A-Z0-9 ]+") ? arpabetToIpa(unwrapped) : value;
  }

  static String arpabetToIpa(String pronunciation) {
    if (pronunciation == null || pronunciation.isBlank()) return null;
    String[] tokens = pronunciation.trim().split("\\s+");
    String[] sounds = new String[tokens.length];
    boolean[] vowels = new boolean[tokens.length];
    String[] stressAt = new String[tokens.length];
    int previousVowel = -1;

    for (int i = 0; i < tokens.length; i++) {
      String token = tokens[i];
      char last = token.charAt(token.length() - 1);
      int stress = Character.isDigit(last) ? Character.digit(last, 10) : -1;
      String phone = stress >= 0 ? token.substring(0, token.length() - 1) : token;
      vowels[i] = VOWELS.containsKey(phone);
      if (vowels[i] && stress > 0) stressAt[previousVowel + 1] = stress == 1 ? "ˈ" : "ˌ";
      if (vowels[i]) previousVowel = i;
      sounds[i] = ipaSound(phone, stress);
      if (sounds[i] == null) return null;
    }

    StringBuilder ipa = new StringBuilder("/");
    for (int i = 0; i < sounds.length; i++) {
      if (stressAt[i] != null) ipa.append(stressAt[i]);
      ipa.append(sounds[i]);
    }
    return ipa.append('/').toString();
  }

  private static String ipaSound(String phone, int stress) {
    if ("AH".equals(phone)) return stress == 0 ? "ə" : "ʌ";
    if ("ER".equals(phone)) return stress == 0 ? "ɚ" : "ɝ";
    return VOWELS.containsKey(phone) ? VOWELS.get(phone) : CONSONANTS.get(phone);
  }

  private static final Map<String, String> VOWELS = Map.ofEntries(
      Map.entry("AA", "ɑ"), Map.entry("AE", "æ"), Map.entry("AH", "ʌ"), Map.entry("AO", "ɔ"),
      Map.entry("AW", "aʊ"), Map.entry("AY", "aɪ"), Map.entry("EH", "ɛ"), Map.entry("ER", "ɝ"),
      Map.entry("EY", "eɪ"), Map.entry("IH", "ɪ"), Map.entry("IY", "i"), Map.entry("OW", "oʊ"),
      Map.entry("OY", "ɔɪ"), Map.entry("UH", "ʊ"), Map.entry("UW", "u")
  );
  private static final Map<String, String> CONSONANTS = Map.ofEntries(
      Map.entry("B", "b"), Map.entry("CH", "tʃ"), Map.entry("D", "d"), Map.entry("DH", "ð"),
      Map.entry("F", "f"), Map.entry("G", "ɡ"), Map.entry("HH", "h"), Map.entry("JH", "dʒ"),
      Map.entry("K", "k"), Map.entry("L", "l"), Map.entry("M", "m"), Map.entry("N", "n"),
      Map.entry("NG", "ŋ"), Map.entry("P", "p"), Map.entry("R", "ɹ"), Map.entry("S", "s"),
      Map.entry("SH", "ʃ"), Map.entry("T", "t"), Map.entry("TH", "θ"), Map.entry("V", "v"),
      Map.entry("W", "w"), Map.entry("Y", "j"), Map.entry("Z", "z"), Map.entry("ZH", "ʒ")
  );
}
