// ============================================
// PHANTOM CORE ENGINE v1.1
// Minden oldal ezt használja
// ============================================

window.PhantomCore = {

  version: '1.1',
  attackMode: false,
  attackCount: 0,

  // Láthatatlan Unicode karakterek (Zero-Width)
  INVISIBLE_CHARS: ['\u200B', '\u200C', '\u200D', '\uFEFF', '\u2060', '\u2061', '\u2062', '\u2063'],

  CHAOS_POOL: '∆≈∇∫∑∏√∞≤≥≠±×÷⊕⊗⊘⊙⊚⊛⊜⊝⋈⋉⋊⋋⋌⊿△▲▽▼◇◆○●□■☆★♦♣♠♥§¶†‡∴∵∷∸∹∺∻∼∽∾∿≀≁≂≃≄≅≆≇≈≉≊≋≌≍≎≏≐≑≒≓≔≕≖≗≘≙≚≛≜≝≞≟⌀⌁⌂⌃⌄⌅⌆⌇⌈⌉⌊⌋⌌⌍⌎⌏⌐⌑⌒⌓⌔⌕⌖⌗⌘⌙⌛⌜⌝⌞⌟⌠⡢⌣⌤⌥⌦⌧⌨⍀⍁⍂⍃⍄⍅⍆⍇⍈⍉⍊⍋⍌⍍⍎⍏⍐⍑⍒⍓⍔⍕⍖⍗⍘⍙⍚⍛⍜⍝⍞⍟⍠⍡⍢⍣⍤⍥⍦⍧⍨⍩⍪⍫⍬⍭⍮⍯⍰⍱⍲⍳⍴⍵⍶⍷⍸⍹⍺₀₁₂₃₄₅₆₇₈₉αβγδεζηθικλμνξοπρστυφχψω',

  // ==========================================
  // 1. LÁTHATATLAN KARAKTERES KÓDOLÁS
  // ==========================================

  /**
   * Láthatatlan karakterek szúr be a szövegbe
   * @param {string} text - Az eredeti szöveg
   * @param {number} density - 0-1 között (mennyi karakter legyen beszúrva)
   * @returns {string} - Kódolt szöveg láthatatlan karakterekkel
   */
  addInvisibleChars(text, density = 0.3) {
    if (!text) return text
    let result = ''
    const chars = this.INVISIBLE_CHARS

    for (let i = 0; i < text.length; i++) {
      result += text[i]
      // Minden 2-4 karakter után szúrjunk be láthatatlant
      if (i % Math.floor(2 + Math.random() * 3) === 0 && i < text.length - 1) {
        if (Math.random() < density) {
          // 1-3 láthatatlan karakter egymás után
          const count = 1 + Math.floor(Math.random() * 3)
          for (let j = 0; j < count; j++) {
            result += chars[Math.floor(Math.random() * chars.length)]
          }
        }
      }
    }
    return result
  },

  /**
   * Láthatatlan karakterek eltávolítása (visszaállítás)
   * @param {string} text - Kódolt szöveg
   * @returns {string} - Tisztított szöveg
   */
  removeInvisibleChars(text) {
    if (!text) return text
    const regex = new RegExp('[' + this.INVISIBLE_CHARS.join('') + ']', 'g')
    return text.replace(regex, '')
  },

  // ==========================================
  // 2. MÁSOLÁSVÉDELEM (CLIPBOARD)
  // ==========================================

  /**
   * Védett másolás: láthatatlan karaktereket szúr be
   * @param {string} text - A másolni kívánt szöveg
   * @param {string} mode - 'invisible' (alap) vagy 'chaos' (zaj)
   * @returns {string} - Védelemmel ellátott szöveg
   */
  protectCopy(text, mode = 'invisible') {
    if (!text) return text

    // Ha támadás van, dupla védelem
    const isAttacking = this.attackMode

    if (mode === 'chaos') {
      // Zajos kódolás (eredeti módszer)
      return this.encode(text, isAttacking ? 2 : 1)
    }

    // Láthatatlan karakteres védelem (alap)
    let protectedText = this.addInvisibleChars(text, isAttacking ? 0.6 : 0.3)

    // Ha támadás van, keverjük a két módszert
    if (isAttacking) {
      // Szúrjunk be néhány chaos karaktert is a láthatatlanok mellé
      const chaosChars = this.CHAOS_POOL.split('').slice(0, 20)
      const positions = []
      for (let i = 0; i < protectedText.length; i++) {
        if (i % 10 === 0 && Math.random() > 0.7) {
          positions.push(i)
        }
      }
      let result = ''
      for (let i = 0; i < protectedText.length; i++) {
        if (positions.includes(i)) {
          result += chaosChars[Math.floor(Math.random() * chaosChars.length)]
        }
        result += protectedText[i] || ''
      }
      protectedText = result
    }

    return protectedText
  },

  /**
   * Vágólap védelem aktiválása
   * @param {string} text - A védeni kívánt szöveg
   * @param {Function} callback - Opcionális callback a másolás után
   * @returns {Function} - Tisztító függvény
   */
  activateClipboardProtection(text, callback = null) {
    const originalText = text

    const handler = (e) => {
      const selection = window.getSelection()
      if (!selection || selection.toString().length === 0) return

      // Ellenőrizzük, hogy a kijelölt szöveg része-e a védett tartalomnak
      const selectedText = selection.toString()
      if (!selectedText || selectedText.length < 3) return

      // Védett verzió előállítása
      const protectedText = this.protectCopy(originalText, 'invisible')

      // Vágólapra helyezés
      e.clipboardData.setData('text/plain', protectedText)
      e.clipboardData.setData('text/html', `<span style="all:unset">${protectedText}</span>`)
      e.preventDefault()

      // Esemény naplózása
      this.logEvent('clipboard_protected', { length: originalText.length })

      // Callback hívás
      if (callback) callback(protectedText)
    }

    document.addEventListener('copy', handler)

    // Visszatérés a tisztító függvénnyel
    return () => {
      document.removeEventListener('copy', handler)
    }
  },

  // ==========================================
  // 3. BEILLESZTÉS VÉDELEM (PASTE)
  // ==========================================

  /**
   * Beillesztés tisztítása (láthatatlan karakterek eltávolítása)
   * @param {string} text - A beillesztett szöveg
   * @returns {string} - Tisztított szöveg
   */
  sanitizePaste(text) {
    return this.removeInvisibleChars(text)
  },

  /**
   * Beillesztés védelem aktiválása
   * @param {HTMLElement} element - Az input/textarea elem
   */
  activatePasteProtection(element) {
    if (!element) return

    element.addEventListener('paste', (e) => {
      const text = e.clipboardData.getData('text/plain')
      const sanitized = this.sanitizePaste(text)
      if (text !== sanitized) {
        e.preventDefault()
        // Beillesztjük a tisztított verziót
        const start = element.selectionStart
        const end = element.selectionEnd
        const value = element.value
        element.value = value.substring(0, start) + sanitized + value.substring(end)
        element.selectionStart = element.selectionEnd = start + sanitized.length
        this.logEvent('paste_sanitized', { originalLength: text.length, sanitizedLength: sanitized.length })
      }
    })
  },

  // ==========================================
  // 4. EREDETI FÜGGVÉNYEK (MEGTARTVA)
  // ==========================================

  // Alap kódolás (megtartva a kompatibilitás miatt)
  encode(text, multiplier = 1) {
    const charsPerLetter = this.attackMode ? 18 * multiplier : 9 * multiplier
    let result = ''
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      if (ch === '\n') {
        result += '\n'
      } else if (ch === ' ') {
        result += ' '
      } else {
        for (let j = 0; j < charsPerLetter; j++) {
          result += this.CHAOS_POOL[Math.floor(Math.random() * this.CHAOS_POOL.length)]
        }
        result += ' '
      }
    }
    return result
  },

  // Token generálás olvasónak
  generateToken(articleId) {
    const ts = Date.now()
    const rand = Math.random().toString(36).substring(2, 10)
    return btoa(`${articleId}:${ts}:${rand}`).replace(/=/g, '')
  },

  // Token validálás
  validateToken(token) {
    try {
      const decoded = atob(token)
      const parts = decoded.split(':')
      if (parts.length !== 3) return false
      const ts = parseInt(parts[1])
      return (Date.now() - ts) < 30 * 24 * 60 * 60 * 1000
    } catch {
      return false
    }
  },

  // Cikk mentése localStorage-ba
  saveArticle(article) {
    const articles = this.getArticles()
    articles[article.id] = article
    localStorage.setItem('phantom_articles', JSON.stringify(articles))
    return article
  },

  // Cikkek lekérése
  getArticles() {
    try {
      return JSON.parse(localStorage.getItem('phantom_articles') || '{}')
    } catch {
      return {}
    }
  },

  // Egy cikk lekérése
  getArticle(id) {
    return this.getArticles()[id] || null
  },

  // Egyedi ID generálás
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 6)
  },

  // Támadás aktiválás
  triggerAttack() {
    this.attackMode = true
    this.attackCount++
    const duration = 5000 + this.attackCount * 2000
    setTimeout(() => { this.attackMode = false }, duration)
    return duration
  },

  // Bot detektálás
  isBot() {
    const ua = navigator.userAgent.toLowerCase()
    const bots = [
      'googlebot', 'gptbot', 'claudebot', 'anthropic',
      'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
      'yandexbot', 'facebookexternalhit', 'twitterbot',
      'linkedinbot', 'whatsapp', 'telegrambot', 'applebot',
      'semrushbot', 'ahrefsbot', 'mj12bot', 'dotbot',
      'perplexitybot', 'cohere', 'mistral', 'deepseek'
    ]
    return bots.some(bot => ua.includes(bot))
  },

  // Olvasási statisztika mentése
  logEvent(type, data = {}) {
    const events = JSON.parse(localStorage.getItem('phantom_events') || '[]')
    events.unshift({
      type,
      data,
      ts: Date.now(),
      ua: navigator.userAgent.substring(0, 80)
    })
    if (events.length > 500) events.splice(500)
    localStorage.setItem('phantom_events', JSON.stringify(events))
  },

  // Események lekérése
  getEvents() {
    try {
      return JSON.parse(localStorage.getItem('phantom_events') || '[]')
    } catch {
      return []
    }
  },

  // Idő formázás
  timeAgo(ts) {
    const diff = Date.now() - ts
    if (diff < 60000) return 'most'
    if (diff < 3600000) return Math.floor(diff / 60000) + ' perce'
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' órája'
    return Math.floor(diff / 86400000) + ' napja'
  }
}
