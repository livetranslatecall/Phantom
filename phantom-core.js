// ============================================
// PHANTOM CORE ENGINE v1.0
// Minden oldal ezt használja
// ============================================

window.PhantomCore = {

  version: '1.0',
  attackMode: false,
  attackCount: 0,

  CHAOS_POOL: '∆≈∇∫∑∏√∞≤≥≠±×÷⊕⊗⊘⊙⊚⊛⊜⊝⋈⋉⋊⋋⋌⊿△▲▽▼◇◆○●□■☆★♦♣♠♥§¶†‡∴∵∷∸∹∺∻∼∽∾∿≀≁≂≃≄≅≆≇≈≉≊≋≌≍≎≏≐≑≒≓≔≕≖≗≘≙≚≛≜≝≞≟⌀⌁⌂⌃⌄⌅⌆⌇⌈⌉⌊⌋⌌⌍⌎⌏⌐⌑⌒⌓⌔⌕⌖⌗⌘⌙⌛⌜⌝⌞⌟⌠⡢⌣⌤⌥⌦⌧⌨⍀⍁⍂⍃⍄⍅⍆⍇⍈⍉⍊⍋⍌⍍⍎⍏⍐⍑⍒⍓⍔⍕⍖⍗⍘⍙⍚⍛⍜⍝⍞⍟⍠⍡⍢⍣⍤⍥⍦⍧⍨⍩⍪⍫⍬⍭⍮⍯⍰⍱⍲⍳⍴⍵⍶⍷⍸⍹⍺₀₁₂₃₄₅₆₇₈₉αβγδεζηθικλμνξοπρστυφχψω',

  // Alap kódolás
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
      // Token 30 napig érvényes
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
    // Max 500 event tárolás
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