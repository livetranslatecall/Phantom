// ============================================
// PHANTOM CORE ENGINE v2.0 - ÖNVÉDŐ RENDSZER
// ============================================

window.PhantomCore = {

  version: '2.0',
  attackMode: false,
  attackCount: 0,
  integrityCheck: true,
  selfDefenseActive: true,

  // ... (meglévő kód INVISIBLE_CHARS, CHAOS_POOL, stb.)

  // ==========================================
  // 5. DEVTools / KONZOL VÉDELEM
  // ==========================================

  /**
   * DevTools nyitás detektálása
   * @returns {boolean} - True ha DevTools nyitva van
   */
  isDevToolsOpen() {
    const threshold = 160
    const widthThreshold = window.outerWidth - window.innerWidth > threshold
    const heightThreshold = window.outerHeight - window.innerHeight > threshold
    return widthThreshold || heightThreshold
  },

  /**
   * DevTools védelem aktiválása
   * - Figyeli a konzolt, a debugger-t
   * - Támadás esetén zajt generál
   */
  activateDevToolsProtection() {
    // 1. Debugger blokkolás
    document.addEventListener('keydown', (e) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && ['I', 'J'].includes(e.key.toUpperCase())) ||
          (e.ctrlKey && e.key === 'u')) {
        e.preventDefault()
        this.logEvent('devtools_attempt', { method: 'keyboard' })
        this.triggerAttack()
        return false
      }
    })

    // 2. Konzol figyelés
    const originalLog = console.log
    const originalWarn = console.warn
    const originalError = console.error

    console.log = function(...args) {
      // Ha valaki a konzolban akar logolni, zajt generálunk
      if (args.length > 0 && typeof args[0] === 'string') {
        const msg = args[0]
        if (msg.includes('phantom') || msg.includes('Phantom')) {
          PhantomCore.logEvent('console_probe', { message: msg })
          PhantomCore.triggerAttack()
        }
      }
      originalLog.apply(console, args)
    }

    // 3. Intervallumos ellenőrzés
    setInterval(() => {
      if (this.isDevToolsOpen()) {
        this.logEvent('devtools_detected', {
          widthDiff: window.outerWidth - window.innerWidth,
          heightDiff: window.outerHeight - window.innerHeight
        })
        // Nem blokkoljuk, csak naplózzuk - a támadó ne tudja, hogy észleltük
      }
    }, 2000)
  },

  // ==========================================
  // 6. ÖNVÉDELMI MECHANIZMUSOK
  // ==========================================

  /**
   * Integritás ellenőrzés - megakadályozza a script módosítást
   */
  activateIntegrityProtection() {
    // Ellenőrizzük a kritikus függvényeket
    const criticalFunctions = [
      'saveArticle',
      'getArticles',
      'encode',
      'addInvisibleChars',
      'protectCopy'
    ]

    // Minden másodpercben ellenőrizzük
    setInterval(() => {
      for (const fn of criticalFunctions) {
        if (typeof this[fn] !== 'function') {
          // Valaki megváltoztatta a függvényt!
          this.logEvent('integrity_breach', { function: fn })
          this.triggerAttack()
          // Próbáljuk újra betölteni az eredeti függvényt
          this.restoreFunction(fn)
        }
      }
    }, 3000)

    // Objektum fagyasztás (megakadályozza a módosítást)
    if (Object.freeze) {
      // Csak a kritikus részeket fagyasztjuk
      const critical = {
        INVISIBLE_CHARS: this.INVISIBLE_CHARS,
        CHAOS_POOL: this.CHAOS_POOL
      }
      Object.freeze(critical)
    }
  },

  /**
   * Függvény visszaállítása sérülés esetén
   */
  restoreFunction(fnName) {
    // A függvényeket a kód elején elmentjük
    if (this._originalFunctions && this._originalFunctions[fnName]) {
      this[fnName] = this._originalFunctions[fnName]
    }
  },

  // ==========================================
  // 7. INTELLIGENS ZAVARÓ RÉTEG
  // ==========================================

  /**
   * Adaptív zavaró réteg - AI elleni védelem
   * @param {string} text - A védendő szöveg
   * @param {number} level - 1-5 között a védelem erőssége
   */
  adaptiveChaos(text, level = 3) {
    if (!text) return text

    const levels = {
      1: { invisible: 0.1, chaos: 0, semantic: 0 },
      2: { invisible: 0.2, chaos: 0.1, semantic: 0 },
      3: { invisible: 0.3, chaos: 0.2, semantic: 0.1 },
      4: { invisible: 0.5, chaos: 0.3, semantic: 0.2 },
      5: { invisible: 0.7, chaos: 0.5, semantic: 0.3 }
    }

    const config = levels[Math.min(Math.max(level, 1), 5)] || levels[3]
    let result = text

    // 1. Láthatatlan karakterek
    if (config.invisible > 0) {
      result = this.addInvisibleChars(result, config.invisible)
    }

    // 2. Chaos karakterek keverése
    if (config.chaos > 0) {
      const chaosChars = this.CHAOS_POOL.split('')
      let mixed = ''
      for (let i = 0; i < result.length; i++) {
        mixed += result[i]
        if (Math.random() < config.chaos && i % 2 === 0) {
          mixed += chaosChars[Math.floor(Math.random() * chaosChars.length)]
        }
      }
      result = mixed
    }

    // 3. Szemantikus zavarás (szórend felbontás)
    if (config.semantic > 0 && result.split(' ').length > 10) {
      const words = result.split(' ')
      const shuffled = []
      for (let i = 0; i < words.length; i++) {
        if (Math.random() < config.semantic && i > 1 && i < words.length - 1) {
          // Két szó megcserélése
          if (i + 1 < words.length) {
            shuffled.push(words[i + 1])
            shuffled.push(words[i])
            i++
          } else {
            shuffled.push(words[i])
          }
        } else {
          shuffled.push(words[i])
        }
      }
      result = shuffled.join(' ')
    }

    return result
  },

  // ==========================================
  // 8. CSALÓDÁS (DECEPTION)
  // ==========================================

  /**
   * Hamis adatok generálása támadóknak
   * @param {string} original - Eredeti szöveg
   * @returns {string} - Hamis szöveg
   */
  generateHoneypot(original) {
    const fakeTexts = [
      'Ez a tartalom nem érhető el az AI számára.',
      'A Phantom védelmi rendszer blokkolta ezt a kérést.',
      '⚠️ Támadási kísérlet észlelve. Minden adat naplózva.',
      'A rendszer védett. Minden próbálkozás rögzítésre kerül.',
      'Phantom önvédelmi protokoll aktiválva.'
    ]
    return fakeTexts[Math.floor(Math.random() * fakeTexts.length)]
  },

  /**
   * Csalogató tartalom generálása botoknak
   */
  activateHoneypot() {
    // Rejtett mezők, amiket csak a botok látnak
    const honeypotDiv = document.createElement('div')
    honeypotDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px;'
    honeypotDiv.innerHTML = `
      <input type="text" name="phantom_honeypot" value="${this.generateHoneypot('')}" />
      <div class="phantom-bot-trap">${this.generateHoneypot('')}</div>
    `
    document.body.appendChild(honeypotDiv)

    // Ha valaki kitölti ezt a mezőt -> bot
    const input = honeypotDiv.querySelector('input')
    if (input) {
      input.addEventListener('focus', () => {
        this.logEvent('honeypot_triggered', { type: 'bot' })
        this.triggerAttack()
      })
    }
  },

  // ==========================================
  // 9. RATE LIMITING (TÚLTERHELÉS ELLEN)
  // ==========================================

  /**
   * Rate limiter - megakadályozza a túl gyors kéréseket
   */
  createRateLimiter(maxRequests = 10, timeWindow = 60000) {
    const requests = []

    return (action) => {
      const now = Date.now()
      // Régi kérések eltávolítása
      while (requests.length > 0 && now - requests[0] > timeWindow) {
        requests.shift()
      }

      if (requests.length >= maxRequests) {
        this.logEvent('rate_limit_exceeded', { action, count: requests.length })
        this.triggerAttack()
        return false // Tiltva
      }

      requests.push(now)
      return true // Engedélyezve
    }
  },

  // ==========================================
  // 10. RENDSZER ÖNVÉDELEM - INDÍTÁS
  // ==========================================

  /**
   * Minden védelmi réteg aktiválása
   */
  activateAllProtections() {
    console.log('🛡️ Phantom Security System v2.0 aktiválva')

    // 1. DevTools védelem
    this.activateDevToolsProtection()

    // 2. Integritás védelem
    this.activateIntegrityProtection()

    // 3. Honeypot
    this.activateHoneypot()

    // 4. Rate limiter létrehozása (global)
    this.rateLimiter = this.createRateLimiter(20, 30000)

    // 5. Self-destruct (végső eset)
    this.activateSelfDestruct()

    // 6. Minden esemény naplózása
    this.logEvent('security_activated', { version: this.version })

    return this
  },

  // ==========================================
  // 11. SELF-DESTRUCT (VÉGSŐ VÉDELEM)
  // ==========================================

  /**
   * Önpusztító mechanizmus - extrém támadás esetén
   */
  activateSelfDestruct() {
    let attempts = 0
    const maxAttempts = 3

    document.addEventListener('keydown', (e) => {
      // Titkos kombináció: Ctrl+Alt+Shift+D (admin override)
      if (e.ctrlKey && e.altKey && e.shiftKey && e.key === 'D') {
        this.selfDestruct = false // Kikapcsolás
        this.logEvent('selfdestruct_disabled', { reason: 'admin_override' })
        return
      }

      // Támadás észlelése esetén
      if (this.attackMode && (e.ctrlKey || e.metaKey)) {
        attempts++
        if (attempts > maxAttempts) {
          this.triggerSelfDestruct()
        }
      }
    })
  },

  /**
   * Önpusztítás végrehajtása
   */
  triggerSelfDestruct() {
    this.logEvent('selfdestruct_triggered', {
      attackCount: this.attackCount,
      timestamp: Date.now()
    })

    // 1. Minden adat törlése
    localStorage.removeItem('phantom_articles')
    localStorage.removeItem('phantom_events')

    // 2. Zaj generálás
    document.body.innerHTML = this.encode('A PHANTOM RENDSZER ÖNVÉDELMET AKTIVÁLT. MINDEN ADAT TÖRLŐDÖTT.')

    // 3. Átirányítás (opcionális)
    // window.location.href = 'https://livetranslatecall.github.io/Phantom/'

    // 4. Értesítés
    alert('⚠️ PHANTOM ÖNVÉDELEM AKTIVÁLVA - Minden adat törölve!')
  },

  // ==========================================
  // 12. TITKOSÍTÁS (ENCRYPTION)
  // ==========================================

  /**
   * Egyszerű titkosítás az adatok védelmére
   */
  simpleEncrypt(text, key = 'phantom2024') {
    let result = ''
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      result += String.fromCharCode(charCode)
    }
    return btoa(result)
  },

  /**
   * Visszafejtés
   */
  simpleDecrypt(encrypted, key = 'phantom2024') {
    try {
      const text = atob(encrypted)
      let result = ''
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        result += String.fromCharCode(charCode)
      }
      return result
    } catch {
      return null
    }
  },

  /**
   * Titkosított cikk mentés
   */
  saveEncryptedArticle(article) {
    const encrypted = {
      ...article,
      content: this.simpleEncrypt(article.content),
      phantomContent: this.simpleEncrypt(article.phantomContent || '')
    }
    return this.saveArticle(encrypted)
  },

  /**
   * Titkosított cikk visszafejtése
   */
  getDecryptedArticle(id) {
    const article = this.getArticle(id)
    if (!article) return null
    return {
      ...article,
      content: this.simpleDecrypt(article.content) || article.content,
      phantomContent: this.simpleDecrypt(article.phantomContent) || article.phantomContent
    }
  }
}
