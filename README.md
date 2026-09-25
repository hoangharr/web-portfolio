# Personal Web Portfolio

## English curriculum media

The curriculum contains six modules at each CEFR level from A1 through B2. Run
`npm run check` after editing lesson JSON.

Neural pronunciation clips are optional deploy artifacts, not required Git
assets. `data/tts-manifest.json` may map lesson text to MP3 files hosted either
under `public/audio/tts/` or on object storage/CDN. When an entry is absent, the
client selects the best English voice installed by the browser or operating
system instead of preventing the lesson from loading.

All generated MP3 files under `public/audio/` are ignored by Git. To publish
them to S3-compatible object storage and serve both listening and pronunciation
audio from there:

```bash
aws s3 sync public/audio/ s3://YOUR_BUCKET/audio/ \
  --endpoint-url https://YOUR_S3_ENDPOINT \
  --content-type audio/mpeg
```

Set the `media-base-url` meta tag in `english.html` to the bucket's public/CDN
origin (without a trailing slash). Local development can leave it empty and
will continue to load files from `public/audio/`. The bucket must allow `GET`
requests and CORS requests from the web application's origin.

`scripts/generate-neural-tts.py` uses the unofficial `edge-tts` client. It is
convenient for local generation, but it is not a guaranteed free production API
and has no service-level agreement. For production, publish generated files to
object storage or replace the generator with a supported TTS provider. Use
`STRICT_MEDIA=1 npm run validate:content` before a media-complete release to
require every listening and pronunciation file to exist.

Run `python3 scripts/generate-neural-tts.py --manifest-only` to rebuild the
manifest without installing or contacting `edge-tts` when all MP3 files already
exist locally.
