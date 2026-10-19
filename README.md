# Smart Document & Page Translator (واجهة عربية RTL)

The interface is Arabic-only (RTL). Interface strings live in `components/*`; error messages in `lib/*` and `app/api/*`.

Translate a web page or an uploaded document, keep its structure, compare original and translation
side by side, and download the result as PDF, Word, text or HTML.

## Run it

```bash
npm install
cp .env.example .env.local      # optional: works as-is with the free engine
npm run dev                     # http://localhost:3000
```


## Translation engines

It works with no setup: the default engine is **Google Translate's free public endpoint** (no API key).
It is unofficial, so Google can rate-limit it; use it for personal or low-volume use.

| Engine | How to use |
| --- | --- |
| `google-free` | Default. Nothing to configure. |
| `libretranslate` | Free and open source. Run your own server and set `LIBRETRANSLATE_URL`. Lower Arabic quality. |
| `deepl` | Set `DEEPL_API_KEY` (auto-selected when the key exists). |
| `google` | Official API: `TRANSLATION_PROVIDER=google` and `GOOGLE_TRANSLATE_API_KEY`. |
| `mock` | Test mode, no network. |

To add another engine, add an object with `translateBatch(texts, { source, target })` to
`lib/translation/providers.js` and register it.

## Install as an app (PWA)

The app is installable on iPhone, iPad, Android and laptops.

- `public/manifest.json`: name, colours, `standalone` display, 192/512 px and maskable icons.
- `public/sw.js`: service worker. Pages are network-first with an offline fallback (`public/offline.html`),
  built assets are cached, and `/api/*` is never cached. Bump `VERSION` in the file to clear old caches on every device.
- `components/InstallApp.js`: an "Install app" button in the header and a dismissible banner.
  Chrome and Edge get the native install prompt. iPhone and iPad (Safari) get step by step help: Share, then Add to Home Screen.
- `public/icons/*`: app icons. Replace these PNGs to rebrand (keep the file names and sizes).

Things to know:

- **Installing needs HTTPS.** It works on `localhost` and on any deployed HTTPS site, but not on a plain
  `http://192.168.x.x` address from your phone. Deploy (for example to Vercel) to test installing on a phone.
- The service worker only registers in production: use `npm run build && npm start`, not `npm run dev`.
- iOS ignores the manifest icons and uses `apple-touch-icon.png`.
- Translation still needs a connection. Offline, the app opens and shows a friendly offline page.

## Project structure

```
app/
  layout.js, page.js, globals.css
  api/translate/route.js      POST: URL or file -> { originalHtml, translatedHtml }
  api/export/route.js         POST: translated HTML -> .docx / .txt / .html
components/                   Header, ThemeToggle, Translator, Dropzone, LanguageSelect, PreviewPane, ExportMenu,
                              InstallApp, PwaRegister
public/                       manifest.json, sw.js, offline.html, icons/
lib/
  languages.js                language list (codes, native names, RTL flag, OCR pack)
  errors.js                   AppError (messages safe to show users)
  net/safe-fetch.js           URL fetching with SSRF protection, redirects, size and time limits
  html/                       prepare.js (sanitise page), shell.js (document wrapper), translate-html.js
  extract/                    url, pdf, docx, text, image, index (picks the reader)
  translation/                index.js (batching), providers.js (mock, DeepL, Google), http.js (retries)
  export/                     docx.js, text.js
  client/export.js            download and print helpers
```

## Known limits (worth knowing before you ship)

- **Inline formatting splits sentences.** In `Hello <b>world</b>` the two text nodes are translated separately,
  which can read slightly unnatural in some languages. DeepL's `tag_handling: "html"` option is the usual fix: translate
  block elements as HTML fragments instead of single text nodes.
- **PDFs are reflowed, not reproduced.** Text is extracted and rebuilt as a clean page; the original page design is not kept.
  Scanned PDFs have no text layer: upload the pages as images (OCR) instead.
- **JavaScript-rendered sites** (many single-page apps) arrive nearly empty because the page is fetched, not run in a browser.
  Add a headless browser (Playwright) in `lib/extract/url.js` if you need them.
- **Pages behind a login or bot protection** cannot be fetched.
- **OCR** downloads language data on first use and is slower and less exact than text extraction.
- **DOCX export** does not embed images. Legacy `.doc` files are not supported.
- **Hosting limits:** serverless hosts cap request size and run time (Vercel: about 4.5 MB request bodies by default).
  For large uploads, self-host or upload to storage first. OCR needs a writable temp folder.
- Set `MAX_TRANSLATE_CHARS` to control cost; the default is 150,000 characters per request.
- The app has no login or rate limiting. Add both before exposing it publicly, since each request can spend translation credits.
