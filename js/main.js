(() => {
  'use strict';

  // === Config ===
  const AVAILABLE_LANGS = ['en', 'fr', 'gk'];
  const FLAG_ICONS = {
    en: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" role="img" aria-labelledby="title desc">
  <title id="title">Union Flag (United Kingdom)</title>
  <desc id="desc">Union Jack: blue field with white and red crosses and saltires</desc>

  <!-- Fond bleu -->
  <rect width="60" height="30" fill="#012169"/>

  <!-- Diagonales blanches (saltires) -->
  <g stroke="#fff" stroke-width="6" stroke-linecap="square" fill="none">
    <path d="M0 0 L60 30"/>
    <path d="M60 0 L0 30"/>
  </g>

  <!-- Diagonales rouges (saltires) — derrière la croix centrale -->
  <g stroke="#C8102E" stroke-width="4" stroke-linecap="square" fill="none">
    <path d="M0 0 L60 30"/>
    <path d="M60 0 L0 30"/>
  </g>

  <!-- Croix blanche centrale (horizontale + verticale) -->
  <g stroke="#fff" stroke-width="10" stroke-linecap="square" fill="none">
    <path d="M30 0 L30 30"/>
    <path d="M0 15 L60 15"/>
  </g>

  <!-- Croix rouge centrale (sur la blanche) -->
  <g stroke="#C8102E" stroke-width="6" stroke-linecap="square" fill="none">
    <path d="M30 0 L30 30"/>
    <path d="M0 15 L60 15"/>
  </g>
</svg>
`,
    fr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="1" height="2" x="0" fill="#0055A4"/><rect width="1" height="2" x="1" fill="#fff"/><rect width="1" height="2" x="2" fill="#EF4135"/></svg>`,
    gk: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 27 18" role="img" aria-labelledby="title desc">
  <title id="title">Drapeau de la Grèce</title>
  <desc id="desc">Neuf bandes horizontales bleu et blanc avec un canton bleu portant une croix blanche</desc>

  <!-- Couleur bleu officiel approximée -->
  <defs>
    <style> .gblue{fill:#0D5EAF} </style>
  </defs>

  <rect x="0" y="0" width="27" height="18" fill="#fff"/>

  <!-- Neuf bandes (hauteur totale 18 -> chaque bande = 2) -->
  <!-- bandes bleues aux positions 0,2,4,6,8 -->
  <rect class="gblue" x="0" y="0" width="27" height="2"/>
  <rect class="gblue" x="0" y="4" width="27" height="2"/>
  <rect class="gblue" x="0" y="8" width="27" height="2"/>
  <rect class="gblue" x="0" y="12" width="27" height="2"/>
  <rect class="gblue" x="0" y="16" width="27" height="2"/>

  <!-- Canton : carré de côté 10 (5 bandes * 2) -->
  <rect class="gblue" x="0" y="0" width="10" height="10"/>

  <!-- Croix blanche dans le canton (épaisseur = 2) -->
  <rect x="4" y="0" width="2" height="10" fill="#fff"/>
  <rect x="0" y="4" width="10" height="2" fill="#fff"/>
</svg>`
  };
  const FETCH_TIMEOUT_MS = 5000;     // timeout pour HEAD
  const CONCURRENCY = 6;             // limite de requêtes parallèles pour vérifs

  // === Utilitaires ===
  const isMobile = () => window.innerWidth <= 768;
  const isLocal = window.location.protocol === 'file:';

  function timeoutFetch(resource, options = {}, ms = FETCH_TIMEOUT_MS) {
    // fetch avec timeout via AbortController
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return fetch(resource, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(id));
  }

  async function headExists(url) {
    try {
      // pour file:// on ne peut pas HEAD via fetch ; on suppose vrai (développement local)
      if (isLocal) return true;
      const res = await timeoutFetch(url, { method: 'HEAD', cache: 'no-store' });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  // pMap simple (limite de concurrence)
  async function pMap(list, mapper, concurrency = CONCURRENCY) {
    const results = [];
    const executing = [];
    for (const item of list) {
      const p = Promise.resolve().then(() => mapper(item));
      results.push(p);
      executing.push(p);
      if (executing.length >= concurrency) {
        await Promise.race(executing).catch(() => {}); // on attend qu'une promise se résolve
        // retire les résolues
        for (let i = executing.length - 1; i >= 0; i--) {
          if (executing[i].settled) executing.splice(i, 1);
        }
        // Note: on ne peut pas inspecter l'état des Promises standard — laisser executing vider progressivement
        // c'est une implémentation simple mais efficace dans la plupart des cas
      }
    }
    return Promise.all(results);
  }

  // === DOM ready ===
  document.addEventListener('DOMContentLoaded', async () => {

    // --- Insérer année courante si élément présent ---
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    // --- Lang switcher ---
    const container = document.createElement('div');
    container.id = 'lang-switcher';
    container.style.display = 'flex';
    container.style.gap = '8px';
    container.style.alignItems = 'center';

    // Récupère segments du chemin (fonctionne aussi pour file:)
    const rawPath = isLocal ? window.location.href : window.location.pathname;
    // Normalise : garder uniquement la partie après le host pour http(s)
    const pathForSegments = isLocal ? rawPath : (rawPath.startsWith('/') ? rawPath.slice(1) : rawPath);
    const pathSegments = pathForSegments.split('/').filter(Boolean);

    const langIndex = pathSegments.findIndex(seg => AVAILABLE_LANGS.includes(seg));
    const currentLang = langIndex >= 0 ? pathSegments[langIndex] : null;

    function buildTargetHref(lang) {
      if (!isLocal) {
        // Web : reconstruire pathname en remplaçant/injectant le segment langue
        const segs = [...pathSegments];
        if (langIndex >= 0) {
          segs[langIndex] = lang;
        } else {
          // insérer le tag langue avant le dernier segment si ce dernier ressemble à un fichier
          if (segs.length === 0) {
            segs.push(lang, 'index.html');
          } else {
            const last = segs[segs.length - 1];
            if (last.includes('.')) {
              segs.splice(segs.length - 1, 0, lang);
            } else {
              segs.push(lang, 'index.html');
            }
          }
        }
        // conserve search + hash vides (on retourne un chemin absolu)
        return '/' + segs.join('/');
      } else {
        // file: -> manipule window.location.href
        const href = window.location.href;
        if (langIndex >= 0) {
          // remplace uniquement le segment langue existant dans la partie chemin
          const pattern = new RegExp('/' + currentLang + '(?=/|$)');
          return href.replace(pattern, '/' + lang);
        } else {
          const lastSlash = href.lastIndexOf('/');
          return href.slice(0, lastSlash) + '/' + lang + href.slice(lastSlash);
        }
      }
    }

    async function createLangButtons() {
      // vérifie l'existence en parallèle avec limite
      await pMap(AVAILABLE_LANGS, async (lang) => {
        const target = buildTargetHref(lang);
        const exists = await headExists(target);
        if (!exists) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lang-btn';
        btn.innerHTML = FLAG_ICONS[lang] + `<span class="sr-only">${lang}</span>`;
        btn.title = `Afficher la version ${lang}`;
        btn.setAttribute('aria-label', `Switch to ${lang}`);
        if (currentLang === lang) btn.classList.add('active');
        btn.addEventListener('click', () => {
          // évite un reload inutile si même url
          if (window.location.href !== target) window.location.href = target;
        });
        container.appendChild(btn);
      }, CONCURRENCY);
    }

    await createLangButtons();
    if (container.children.length > 1) {
      // attache en fin de body (tu peux remplacer par une cible précise si besoin)
      document.body.appendChild(container);
    }

    // --- Vérification et réparation des liens <a> multilingues ---
    // Sélecteur : <a> ayant un chemin contenant /fr/... ou /en/... ou /es/...
    const anchors = Array.from(document.querySelectorAll('a[href]'));

    // Filtrer les anchors qui pointent vers le même site et qui contiennent un segment langue
    const candidates = anchors.filter(a => {
      try {
        const href = a.getAttribute('href');
        // ignorer ancres, mails, téléphones
        if (/^(#|mailto:|tel:|javascript:)/i.test(href)) return false;
        const url = new URL(href, window.location.href); // résout relatives
        // n'opère que sur même origine pour éviter CORS
        if (url.origin !== window.location.origin) return false;
        // vérifier pattern /fr/..., /en/..., /es/...
        return new RegExp(`/(?:${AVAILABLE_LANGS.join('|')})(?:/|$)`).test(url.pathname);
      } catch (e) {
        return false;
      }
    });

    // fonction pour traiter un anchor : si HEAD KO, tenter autres langues
    async function repairAnchor(a) {
      try {
        const originalUrl = new URL(a.getAttribute('href'), window.location.href);
        const match = originalUrl.pathname.match(new RegExp(`/(?:${AVAILABLE_LANGS.join('|')})(/.*|$)`));
        if (!match) return; // pas de path qui nous intéresse
        const currentLangMatch = originalUrl.pathname.match(new RegExp(`/(?:${AVAILABLE_LANGS.join('|')})`));
        const currentLang = currentLangMatch ? currentLangMatch[0].slice(1) : null;
        // tester original
        const ok = await headExists(originalUrl.href);
        if (ok) {
          // lien OK, rien à faire
          return;
        }
        // sinon essayer autres langues (séquentiellement)
        const others = AVAILABLE_LANGS.filter(l => l !== currentLang);
        for (const lang of others) {
          // remplace le segment langue dans le pathname
          const altPath = originalUrl.pathname.replace(`/${currentLang}`, `/${lang}`);
          const altUrl = new URL(altPath + originalUrl.search + originalUrl.hash, originalUrl.origin).href;
          const altOk = await headExists(altUrl);
          if (altOk) {
            // mise à jour de l'ancre
            a.href = altUrl;
            //a.style.color = 'orange'; // signal visuel
            a.title = `Version trouvée dans une autre langue : ${lang}`;
            return;
          }
        }
        // aucun alt trouvé
        a.style.color = 'red';
        a.title = 'Lien indisponible dans toutes les langues';
      } catch (err) {
        a.style.color = 'gray';
        a.title = 'Erreur lors de la vérification du lien';
      }
    }

    // exécute avec limite de concurrence
    await pMap(candidates, repairAnchor, CONCURRENCY);

    // --- fin DOMContentLoaded ---
  });

  // Expose utilitaires si besoin pour debug (optionnel)
  window.__i18nUtils = { isMobile, isLocal };
})();
