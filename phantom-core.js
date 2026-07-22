/**
 * PHANTOM CORE ENGINE v3.0
 *
 * Architektúra:
 * - Minden modul izolált, self-contained
 * - Nincs egymásra épülő törékeny lánc
 * - Csak azt ígéri, amit tud teljesíteni
 * - Principal engineer minőség: hibatűrő, tesztelhető, kommentált
 */

;(function (global) {
  'use strict'

  // ─────────────────────────────────────────
  // KONSTANSOK
  // ─────────────────────────────────────────

  /**
   * Zero-width és homoglyph karakterek.
   * Céljuk: copy-paste szöveg megzavarása.
   * Vizuálisan láthatatlanok, de szövegként jelen vannak.
   * Korlát: vágólapon megjelennek, szövegszerkesztőben láthatók.
   */
  const INVISIBLE = Object.freeze([
    '\u200B', // Zero Width Space
    '\u200C', // Zero Width Non-Joiner
    '\u200D', // Zero Width Joiner
    '\uFEFF', // BOM (Zero Width No-Break Space)
    '\u2060', // Word Joiner
  ])

  /**
   * Unicode look-alike karakterek latin betűkhöz.
   * Homoglyph attack: az AI vagy szövegfelismerő más karaktert lát.
   * FONTOS: ez vizuálisan azonos, de kódpont-szinten különbözik.
   * Limit: fejlett NLP modellek normalizálják.
   */
  const HOMOGLYPHS = Object.freeze({
    a: 'а', // Cyrillic а (U+0430)
    e: 'е', // Cyrillic е (U+0435)
    o: 'о', // Cyrillic о (U+043E)
    p: 'р', // Cyrillic р (U+0440)
    c: 'с', // Cyrillic с (U+0441)
    x: 'х', // Cyrillic х (U+0445)
    i: 'і', // Ukrainian і (U+0456)
    A: 'А', // Cyrillic А (U+0410)
    E: 'Е', // Cyrillic Е (U+0415)
    O: 'О', // Cyrillic О (U+041E)
  })

  const VERSION = '3.0.0'

  // ─────────────────────────────────────────
  // ESEMÉNYNAPLÓ (Event Log)
  // ─────────────────────────────────────────

  /**
   * Circular buffer alapú event log.
   * Miért circular buffer? A localStorage véges,
   * és nem akarunk memory leaket.
   */
  function createEventLog(maxEntries = 200) {
    const STORAGE_KEY = 'phantom_log_v3'

    function _load() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      } catch {
        // localStorage parse hiba (corrupted data) → clean slate
        return []
      }
    }

    function _save(entries) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
      } catch (e) {
        // localStorage full (QuotaExceededError) → eldobjuk a legrégebbieket
        if (e.name === 'QuotaExceededError') {
          const trimmed = entries.slice(-Math.floor(maxEntries / 2))
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
          } catch {
            // Ha még így is tele van, feladjuk — a protection nem állhat le
          }
        }
      }
    }

    return {
      push(type, data = {}) {
        const entries = _load()
        entries.push({
          type,
          data,
          ts: Date.now(),
          // Soha ne logoljunk érzékeny adatot client-side-on
          // Csak kategória + metadata
        })

        // Circular: ha túl sok, levágjuk az elejét
        if (entries.length > maxEntries) {
          entries.splice(0, entries.length - maxEntries)
        }

        _save(entries)
      },

      getAll() {
        return _load()
      },

      clear() {
        try {
          localStorage.removeItem(STORAGE_KEY)
        } catch {
          // Ignore
        }
      },
    }
  }

  // ─────────────────────────────────────────
  // SZÖVEG PROTECTION MODULE
  // ─────────────────────────────────────────

  /**
   * Invisible character injection.
   *
   * Algoritmus: szavak között véletlenszerűen szúr be
   * zero-width karaktereket.
   *
   * Edge case-ek:
   * - Üres string → visszaadja érintetlenül
   * - Nem string → TypeError helyett visszaadja az inputot
   * - density 0 → nincs változás
   * - density 1 → minden szó közé kerül karakter
   *
   * @param {string} text
   * @param {number} density - 0.0–1.0, milyen sűrűn szúrjunk be
   * @returns {string}
   */
  function injectInvisibleChars(text, density = 0.3) {
    if (typeof text !== 'string' || text.length === 0) return text
    if (density <= 0) return text
    if (density > 1) density = 1

    const chars = INVISIBLE
    let result = ''

    for (let i = 0; i < text.length; i++) {
      result += text[i]

      // Csak szóköz után, hogy az olvashatóság ne romoljon vizuálisan
      if (text[i] === ' ' && Math.random() < density) {
        result += chars[Math.floor(Math.random() * chars.length)]
      }
    }

    return result
  }

  /**
   * Homoglyph substitution.
   *
   * Egyes karaktereket vizuálisan azonos unicode megfelelőjükre cserél.
   * Célja: OCR és AI szövegkivonat megnehezítése.
   *
   * FONTOS KORLÁT: Modern AI modellek unicode-normalizálást végeznek,
   * ez ellen ez a módszer nem véd. Casual scraper ellen hatékony.
   *
   * @param {string} text
   * @param {number} rate - 0.0–1.0, az érintett karakterek aránya
   * @returns {string}
   */
  function applyHomoglyphs(text, rate = 0.2) {
    if (typeof text !== 'string' || text.length === 0) return text
    if (rate <= 0) return text

    return text
      .split('')
      .map((char) => {
        if (HOMOGLYPHS[char] && Math.random() < rate) {
          return HOMOGLYPHS[char]
        }
        return char
      })
      .join('')
  }

  /**
   * Adaptív védelem — szintje szerint kombinálja a módszereket.
   *
   * Szintek:
   * 1 → Csak minimális invisible char (casual)
   * 2 → Invisible + alacsony homoglyph
   * 3 → Közepes mindkettőből (alapértelmezett)
   * 4 → Erős invisible + közepes homoglyph
   * 5 → Maximális (olvashatóság rovására)
   *
   * Miért nincs szórend-keverés? Az eredeti kód szemantikus
   * zavarása (szócserék) tönkreteszi a valódi felhasználók
   * olvasási élményét is — ez elfogadhatatlan kompromisszum.
   *
   * @param {string} text
   * @param {1|2|3|4|5} level
   * @returns {string}
   */
  function adaptiveProtect(text, level = 3) {
    if (typeof text !== 'string') return text

    const cfg = {
      1: { invisible: 0.10, homoglyph: 0.00 },
      2: { invisible: 0.20, homoglyph: 0.10 },
      3: { invisible: 0.30, homoglyph: 0.20 },
      4: { invisible: 0.50, homoglyph: 0.30 },
      5: { invisible: 0.70, homoglyph: 0.50 },
    }

    // Level clamp: ha érvénytelen, 3-ra esik vissza
    const c = cfg[Math.min(Math.max(Math.floor(level), 1), 5)] || cfg[3]

    let result = text
    result = injectInvisibleChars(result, c.invisible)
    result = applyHomoglyphs(result, c.homoglyph)
    return result
  }

  // ─────────────────────────────────────────
  // DEVTOOLS DETECTION
  // ─────────────────────────────────────────

  /**
   * DevTools detektálás — MEGBÍZHATÓSÁG KORLÁTAI:
   *
   * A window méret heurisztika hamis pozitívokat ad:
   * - Kisebb felbontású monitor
   * - OS szintű zoom
   * - Splitscreen elrendezés
   * - Egyes böngésző extensionök
   *
   * Ezért: CSAK naplózunk, nem triggerlünk agresszív védelmet.
   * A detektálás "soft signal" — nem bizonyíték.
   *
   * Valódi megoldás: szerver-oldali anomália detekció
   * (kérési minták, UA elemzés, stb.)
   */
  function createDevToolsDetector(log) {
    const THRESHOLD = 160
    let _wasOpen = false
    let _intervalId = null

    function _check() {
      // Mindkét feltétel szükséges az outer/inner diff-hez
      const wDiff = window.outerWidth - window.innerWidth
      const hDiff = window.outerHeight - window.innerHeight
      const isOpen = wDiff > THRESHOLD || hDiff > THRESHOLD

      if (isOpen && !_wasOpen) {
        log.push('devtools_opened', { wDiff, hDiff })
      } else if (!isOpen && _wasOpen) {
        log.push('devtools_closed', {})
      }

      _wasOpen = isOpen
      return isOpen
    }

    function start(intervalMs = 2000) {
      if (_intervalId !== null) return // Már fut

      // Azonnali check indításkor
      _check()
      _intervalId = setInterval(_check, intervalMs)
    }

    function stop() {
      if (_intervalId !== null) {
        clearInterval(_intervalId)
        _intervalId = null
      }
    }

    function isOpen() {
      return _wasOpen
    }

    return { start, stop, isOpen }
  }

  // ─────────────────────────────────────────
  // KEYBOARD SHORTCUT DEFENSE
  // ─────────────────────────────────────────

  /**
   * DevTools billentyűkombinációk blokkolása.
   *
   * KORLÁT: Ez a böngésző szintjén NEM blokkolható teljesen.
   * - Firefox: F12 és Ctrl+Shift+I nem preventDefault-olható
   * - Chrome: preventDefault() működik, de a felhasználó
   *   egyszerűen a menüből nyitja meg
   * - Jobb klikk → Inspect: CSS pointer-events:none sem blokkolja
   *
   * Ezért: csak naplózzuk + enyhén visszatartjuk (UX friction).
   *
   * @param {object} log - EventLog instance
   * @returns {function} - cleanup function (removeEventListener)
   */
  function activateKeyboardDefense(log) {
    const BLOCKED_COMBOS = [
      // F12
      (e) => e.key === 'F12',
      // Ctrl+Shift+I / Ctrl+Shift+J
      (e) => e.ctrlKey && e.shiftKey && ['I', 'J'].includes(e.key.toUpperCase()),
      // Ctrl+U (forrás)
      (e) => e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'u',
    ]

    function handler(e) {
      if (BLOCKED_COMBOS.some((test) => test(e))) {
        e.preventDefault()
        log.push('keyboard_devtools_attempt', { key: e.key })
        // Nem triggerelünk agresszív védelmet — hamis pozitív kockázat
      }
    }

    document.addEventListener('keydown', handler, { capture: true })

    // Cleanup function visszaadása
    return () => document.removeEventListener('keydown', handler, { capture: true })
  }

  // ─────────────────────────────────────────
  // HONEYPOT
  // ─────────────────────────────────────────

  /**
   * Bot-csapda rejtett form elemekkel.
   *
   * Működési elv: valódi felhasználó nem látja/tölti ki
   * (CSS alapján), de bot vagy scraper igen.
   *
   * Edge case-ek:
   * - Screen reader: aria-hidden + tabindex=-1 megakadályozza
   * - Autofill: name attribútum elég egyedi legyen
   * - Cleanup: a returned function eltávolítja a DOM-ból
   *
   * @param {object} log - EventLog instance
   * @returns {function} - cleanup function
   */
  function activateHoneypot(log) {
    // Guard: ha nincs DOM (SSR, test env), ne krassoljunk
    if (typeof document === 'undefined' || !document.body) {
      return () => {}
    }

    const container = document.createElement('div')
    container.setAttribute('aria-hidden', 'true')
    container.style.cssText = [
      'position:absolute',
      'left:-99999px',
      'top:-99999px',
      'width:1px',
      'height:1px',
      'overflow:hidden',
      'pointer-events:none', // Valódi klikk ellen
    ].join(';')

    // Egyedi mező neve → autofill nem tölti ki
    const fieldName = `_phantom_${Math.random().toString(36).slice(2)}`

    container.innerHTML = `
      <form>
        <label for="${fieldName}">Leave this field empty</label>
        <input
          type="text"
          id="${fieldName}"
          name="${fieldName}"
          tabindex="-1"
          autocomplete="off"
          value=""
        />
      </form>
    `

    document.body.appendChild(container)

    const input = container.querySelector('input')

    function onFocus() {
      log.push('honeypot_focus', { field: fieldName })
    }

    function onChange() {
      if (input && input.value.length > 0) {
        log.push('honeypot_filled', { field: fieldName, length: input.value.length })
      }
    }

    if (input) {
      input.addEventListener('focus', onFocus)
      input.addEventListener('input', onChange)
    }

    return () => {
      if (input) {
        input.removeEventListener('focus', onFocus)
        input.removeEventListener('input', onChange)
      }
      if (container.parentNode) {
        container.parentNode.removeChild(container)
      }
    }
  }

  // ─────────────────────────────────────────
  // RATE LIMITER
  // ─────────────────────────────────────────

  /**
   * Sliding window rate limiter.
   *
   * Miért sliding window és nem fixed window?
   * Fixed window: 10 req utolsó másodpercben + 10 az első másodpercben
   * = 20 req egy ablak határán átmenve → burst attack lehetséges.
   * Sliding window: mindig az elmúlt N ms-t nézi → nincs ilyen rés.
   *
   * KORLÁT: Client-side rate limiter kijátszható (oldal reload,
   * localStorage clear). Valódi rate limiting szerveroldalon van.
   * Ez csak UX/bot friction.
   *
   * @param {number} maxRequests - Max engedélyezett kérés az ablakon belül
   * @param {number} windowMs - Az időablak milliszekundumban
   * @returns {object} - { check(actionId): boolean, reset() }
   */
  function createRateLimiter(maxRequests = 10, windowMs = 60_000) {
    // Per-action tracking: Map<actionId, timestamp[]>
    const buckets = new Map()

    function check(actionId = 'default') {
      const now = Date.now()

      if (!buckets.has(actionId)) {
        buckets.set(actionId, [])
      }

      const timestamps = buckets.get(actionId)

      // Régi timestampok eltávolítása (sliding window)
      let cutoff = 0
      while (cutoff < timestamps.length && now - timestamps[cutoff] > windowMs) {
        cutoff++
      }

      // In-place splice a cutoff előtti elemekre
      if (cutoff > 0) timestamps.splice(0, cutoff)

      if (timestamps.length >= maxRequests) {
        return false // Rate limited
      }

      timestamps.push(now)
      return true // Allowed
    }

    function reset(actionId) {
      if (actionId !== undefined) {
        buckets.delete(actionId)
      } else {
        buckets.clear()
      }
    }

    function getStatus(actionId = 'default') {
      const now = Date.now()
      const timestamps = buckets.get(actionId) || []
      const active = timestamps.filter((t) => now - t <= windowMs)
      return {
        used: active.length,
        remaining: Math.max(0, maxRequests - active.length),
        resetsIn: active.length > 0 ? windowMs - (now - active[0]) : 0,
      }
    }

    return { check, reset, getStatus }
  }

  // ─────────────────────────────────────────
  // TITKOSÍTÁS
  // ─────────────────────────────────────────

  /**
   * AES-GCM alapú titkosítás a Web Crypto API-val.
   *
   * Miért nem XOR? A fix kulcsú XOR kriptográfiailag értéktelen:
   * - A kulcs a forráskódban van (mindenki látja)
   * - Known-plaintext attack triviálisan feltöri
   * - Nem nyújt semmilyen valódi védelmet
   *
   * AES-GCM előnyei:
   * - Authenticated encryption (tamper detection)
   * - Véletlen IV minden encrypt híváshoz
   * - Web Crypto API → natív, gyors, auditált
   *
   * FONTOS KORLÁT: A kulcs szintén client-side van.
   * Ha a JS olvasható (és az), a kulcs is olvasható.
   * Ez az encryption elsősorban a tárolt adat (localStorage)
   * ellen véd, nem a kódelemzés ellen.
   *
   * Mindkét függvény Promise-t ad vissza — async Web Crypto miatt.
   */

  /**
   * Szöveg titkosítása AES-GCM-mel.
   * @param {string} plaintext
   * @param {CryptoKey} key - importált CryptoKey
   * @returns {Promise<string>} - base64 kódolt "iv:ciphertext"
   */
  async function encrypt(plaintext, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV (GCM ajánlott)
    const encoded = new TextEncoder().encode(plaintext)

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    )

    // IV + ciphertext összecsomagolva base64-ben
    const combined = new Uint8Array(iv.length + cipherBuffer.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(cipherBuffer), iv.length)

    return btoa(String.fromCharCode(...combined))
  }

  /**
   * Szöveg visszafejtése AES-GCM-mel.
   * @param {string} base64
   * @param {CryptoKey} key
   * @returns {Promise<string|null>} - visszafejtett szöveg, vagy null hiba esetén
   */
  async function decrypt(base64, key) {
    try {
      const combined = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      const iv = combined.slice(0, 12)
      const cipherData = combined.slice(12)

      const plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        cipherData
      )

      return new TextDecoder().decode(plainBuffer)
    } catch {
      // GCM authentication tag mismatch (tampered data) vagy helytelen kulcs
      return null
    }
  }

  /**
   * AES-GCM kulcs generálása.
   * @returns {Promise<CryptoKey>}
   */
  async function generateKey() {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,     // exportable (ha el kell menteni)
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Kulcs exportálása / importálása localStorage-ba mentéshez.
   * Figyelem: ez szintén client-side, tehát a kulcs elérhető.
   * Csak az "inert data at rest" véd valamivel — pl. ha valaki
   * a localStorage-ot dumpolja anélkül, hogy a JS-t futtatná.
   */
  async function exportKey(key) {
    const raw = await crypto.subtle.exportKey('raw', key)
    return btoa(String.fromCharCode(...new Uint8Array(raw)))
  }

  async function importKey(base64) {
    const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    return crypto.subtle.importKey(
      'raw',
      raw,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    )
  }

  // ─────────────────────────────────────────
  // CONTENT SECURITY POLICY HELPER
  // ─────────────────────────────────────────

  /**
   * CSP meta tag hozzáadása, ha még nincs.
   *
   * FONTOS: A meta tag alapú CSP kevésbé erős, mint a HTTP header.
   * - Nem véd minden injection típus ellen
   * - Helyes megoldás: szerver küldi a Content-Security-Policy headert
   *
   * Ez itt fallback, ha szerver nem konfiguráható.
   *
   * @param {string} policy - CSP policy string
   */
  function applyCSPMeta(policy) {
    if (typeof document === 'undefined') return

    // Ha már van CSP meta, ne duplikáljuk
    const existing = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
    if (existing) return

    const meta = document.createElement('meta')
    meta.httpEquiv = 'Content-Security-Policy'
    meta.content = policy

    const head = document.head || document.querySelector('head')
    if (head) {
      head.insertBefore(meta, head.firstChild)
    }
  }

  // ─────────────────────────────────────────
  // COPY PROTECTION (CSS + JS)
  // ─────────────────────────────────────────

  /**
   * Szöveges copy-paste ellen.
   *
   * user-select: none → vizuálisan nem jelölhető ki
   * selectstart event → JS-ből próbálja megakadályozni
   *
   * KORLÁT:
   * - "Ctrl+A, Ctrl+C" majd paste: a szöveg megjelenik
   *   (böngészőtől függően)
   * - DevTools console: document.body.innerText → mindent kiad
   * - Ez casual felhasználót visszatart, nem elszánt scrapert
   *
   * @param {HTMLElement} element - A védendő element
   * @returns {function} - cleanup
   */
  // A phantom-core.js-ben cseréld le az activateCopyProtection függvényt erre:

function activateCopyProtection(element) {
  if (!element) return () => {}

  const originalUserSelect = element.style.userSelect
  const originalWebkit = element.style.webkitUserSelect

  // CSS szinten tiltjuk a kijelölést
  element.style.userSelect = 'none'
  element.style.webkitUserSelect = 'none'

  function onCopy(e) {
    e.preventDefault()
    e.stopPropagation()
    try {
      e.clipboardData.setData(
        'text/plain',
        '⚠️ Ez a tartalom szerzői jogi védelem alatt áll.'
      )
    } catch {
      // Fallback: modern Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(
          '⚠️ Ez a tartalom szerzői jogi védelem alatt áll.'
        ).catch(() => {})
      }
    }
  }

  function onSelectStart(e) {
    e.preventDefault()
    return false
  }

  function onContextMenu(e) {
    e.preventDefault()
    return false
  }

  // Capture phase-ban fogjuk el — megelőzi a böngésző alapértelmezett viselkedését
  element.addEventListener('copy',        onCopy,        { capture: true })
  element.addEventListener('selectstart', onSelectStart, { capture: true })
  element.addEventListener('contextmenu', onContextMenu, { capture: true })

  return () => {
    element.style.userSelect = originalUserSelect
    element.style.webkitUserSelect = originalWebkit
    element.removeEventListener('copy',        onCopy,        { capture: true })
    element.removeEventListener('selectstart', onSelectStart, { capture: true })
    element.removeEventListener('contextmenu', onContextMenu, { capture: true })
  }
}

  // ─────────────────────────────────────────
  // FŐ ENGINE
  // ─────────────────────────────────────────

  /**
   * PhantomCore factory.
   * Nem singleton — minden `create()` hívás független instance-t ad.
   * Ez tesztelhetőbb, mint a globális singleton volt.
   */
  function create(options = {}) {
    const opts = Object.assign(
      {
        logMaxEntries: 200,
        devToolsInterval: 2000,
        rateLimitMax: 20,
        rateLimitWindow: 30_000,
        defaultProtectionLevel: 3,
        cspPolicy: "default-src 'self'; script-src 'self'",
      },
      options
    )

    const log = createEventLog(opts.logMaxEntries)
    const devTools = createDevToolsDetector(log)
    const rateLimiter = createRateLimiter(opts.rateLimitMax, opts.rateLimitWindow)

    // Cleanup registry
    const _cleanups = []

    // Crypto key (async init szükséges)
    let _cryptoKey = null

    /**
     * Aszinkron inicializálás.
     * Web Crypto miatt az init async kell legyen.
     * @returns {Promise<PhantomCore>}
     */
    async function init() {
      // Web Crypto API elérhetőség ellenőrzés
      if (!global.crypto || !global.crypto.subtle) {
        log.push('init_warning', { reason: 'webcrypto_unavailable' })
        // Graceful degradation: encryption nélkül is működik
      } else {
        // Kulcs betöltése vagy generálása
        const storedKey = localStorage.getItem('phantom_key_v3')
        try {
          if (storedKey) {
            _cryptoKey = await importKey(storedKey)
          } else {
            _cryptoKey = await generateKey()
            localStorage.setItem('phantom_key_v3', await exportKey(_cryptoKey))
          }
        } catch (e) {
          log.push('init_warning', { reason: 'key_init_failed', error: e.message })
          // Kulcs nélkül is indul — encryption degraded
        }
      }

      // Rendszer indítás
      devTools.start(opts.devToolsInterval)

      const cleanupKeyboard = activateKeyboardDefense(log)
      const cleanupHoneypot = activateHoneypot(log)

      _cleanups.push(
        () => devTools.stop(),
        cleanupKeyboard,
        cleanupHoneypot
      )

      applyCSPMeta(opts.cspPolicy)

      log.push('phantom_init', { version: VERSION })

      return instance
    }

    /**
     * Szöveg védelem.
     * @param {string} text
     * @param {number} level - 1–5
     */
    function protect(text, level = opts.defaultProtectionLevel) {
      if (!rateLimiter.check('protect')) {
        log.push('rate_limited', { action: 'protect' })
        return text // Degraded: rate limit esetén védetlenül adjuk vissza
      }
      return adaptiveProtect(text, level)
    }

    /**
     * Tartalom titkosítása (async).
     * @param {string} plaintext
     * @returns {Promise<string|null>}
     */
    async function encryptContent(plaintext) {
      if (!_cryptoKey) return null
      try {
        return await encrypt(plaintext, _cryptoKey)
      } catch (e) {
        log.push('encrypt_error', { error: e.message })
        return null
      }
    }

    /**
     * Tartalom visszafejtése (async).
     * @param {string} ciphertext
     * @returns {Promise<string|null>}
     */
    async function decryptContent(ciphertext) {
      if (!_cryptoKey) return null
      try {
        return await decrypt(ciphertext, _cryptoKey)
      } catch (e) {
        log.push('decrypt_error', { error: e.message })
        return null
      }
    }

    /**
     * Copy protection aktiválása egy elemre.
     * @param {HTMLElement} element
     * @returns {function} cleanup
     */
    function protectElement(element) {
      const cleanup = activateCopyProtection(element)
      _cleanups.push(cleanup)
      return cleanup
    }

    /**
     * Teljes leállítás — event listenerek, intervallumok cleanup-ja.
     * SPA-ban oldal-elhagyáskor hívandó.
     */
    function destroy() {
      _cleanups.forEach((fn) => {
        try { fn() } catch { /* Egy cleanup hiba ne állítsa le a többit */ }
      })
      _cleanups.length = 0
      log.push('phantom_destroyed', {})
    }

    const instance = {
      version: VERSION,
      init,
      protect,
      encryptContent,
      decryptContent,
      protectElement,
      destroy,
      // Olvasható státusz
      get isDevToolsOpen() { return devTools.isOpen() },
      get rateLimiterStatus() { return rateLimiter.getStatus.bind(rateLimiter) },
      get eventLog() { return log.getAll() },
      clearLog: () => log.clear(),
    }

    return instance
  }

  // ─────────────────────────────────────────
  // EXPORT
  // ─────────────────────────────────────────

  global.PhantomCore = { create, VERSION }

})(typeof window !== 'undefined' ? window : globalThis)
