# External module recommendations

Each of the 24 modules has optional reading and listening/video resources in
`data/recommendations.json`, displayed after the last section. They do not affect
module completion, test access or scores.

Selection prioritises comprehensible language and a manageable practice session,
then topic fit. A topic may differ when a better level match is available. Long
articles have explicit instructions naming a shorter part to read. Practice time
is an editorial estimate, not media runtime. CEFR is marked `publisher` only when
the source publishes that CEFR label; otherwise it is `estimated`. Published ranges
are retained, not silently converted into single levels.

The initial collection uses 12 publishers/providers: British Council, VOA, ELLLO,
Cambridge English, Oxford Online English (an independent provider, not Oxford
University), BBC Learning English, NASA, Smithsonian, TED-Ed, Khan Academy/Code.org,
NIH/NHLBI and National Geographic Kids. Every module includes at least two sources.
British Council supplies fewer than half of all recommendations. This is a
diversity check, not a reason to include an unsuitable resource.

Official pages were reviewed on 2026-09-29. External resources can change or become
unavailable; review links and level fit when updating the collection. Avoid
paywalls, required accounts, generic home-page links and unofficial reuploads.

No article body or transcript is republished. Source-link resources open the
original lesson, including its transcript where available. Verified official
YouTube videos use a click-to-load privacy-enhanced player and retain a direct
source link as fallback. Captions are not described as an in-app transcript.
For article text, words must currently be entered into the notebook field; this
app cannot highlight or modify text on an external publisher's page. Notebook
saves use the existing authenticated database API, with honest error handling.

Direct VOA website resources have been replaced following a learner report of
network access failures. The remaining VOA video uses YouTube and has no VOA
website or transcript dependency. A regression test checks all resource links.

`npm run check` validates module coverage, source diversity, metadata, escaped
rendering, optional placement, and notebook save handling. It is not a substitute
for device testing or editorial review of external material.
