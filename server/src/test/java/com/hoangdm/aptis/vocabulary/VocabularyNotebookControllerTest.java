package com.hoangdm.aptis.vocabulary;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class VocabularyNotebookControllerTest {
  @Test
  void convertsArpabetToIpaWithPrimaryStress() {
    assertEquals("/ˈbæləns/", VocabularyNotebookController.arpabetToIpa("B AE1 L AH0 N S"));
  }

  @Test
  void convertsLongerPronunciationAndPlacesStressBeforeTheSyllableOnset() {
    assertEquals("/ˌɪnfɚˈmeɪʃən/", VocabularyNotebookController.arpabetToIpa("IH2 N F ER0 M EY1 SH AH0 N"));
  }
}
