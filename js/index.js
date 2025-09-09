 // ========== Sélection des éléments ==========
    const header = document.querySelector('header');
    const intro = document.querySelector('.intro');
    const title = document.querySelector('.intro-title');
    const navToggle = document.getElementById('navToggle');
    const mobileNav = document.getElementById('mobileNav');

    // Utility : mettre à jour la variable CSS --header-height
    function updateHeaderHeightVar() {
      const h = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
      document.documentElement.style.setProperty('--header-height', h + 'px');
    }

    // Ouvre/ferme le mobile nav
    function setMobileNavOpen(isOpen) {
      if (!mobileNav || !navToggle) return;
      if (isOpen) {
        mobileNav.classList.add('open');
        mobileNav.setAttribute('aria-hidden', 'false');
        navToggle.setAttribute('aria-expanded', 'true');
        navToggle.setAttribute('aria-label', 'Fermer le menu');
        // when menu opens, recompute header height (because mobile nav pushes layout)
        updateHeaderHeightVar();
      } else {
        mobileNav.classList.remove('open');
        mobileNav.setAttribute('aria-hidden', 'true');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Ouvrir le menu');
        updateHeaderHeightVar();
      }
    }

    // Fermer menu on resize breakpoint (desktop)
    function handleResize() {
      updateHeaderHeightVar();
      // if viewport becomes wide, ensure mobile menu closed
      if (window.innerWidth > 900) {
        setMobileNavOpen(false);
      }
    }

    // Close on escape
    function handleKeydown(e) {
      if (e.key === 'Escape') setMobileNavOpen(false);
    }

    // ========== Intro + reveal orchestration (conservée et légèrement consolidée) ==========
    function revealContent(){
      // small delay before triggering show-content (conserve ton code initial)
      setTimeout(() => {
        // placeholder pour animations complémentaires si besoin
        startAnimation();
      }, 600);
      document.body.classList.add('show-content');
      updateHeaderHeightVar();
    }

    // Switch intro into flow (position:relative) and allow scroll
    function switchIntroToInFlow() {
      intro.classList.add('intro--inflow');
      updateHeaderHeightVar();
      document.body.classList.add('intro-in-flow');
      document.documentElement.classList.remove('no-scroll');
      document.body.classList.remove('no-scroll');
      // Watch resize to recalc header height
      window.addEventListener('resize', updateHeaderHeightVar, { passive: true });
    }

    // Main orchestration (conserve fallback logic)
    (function(){
      if (!title){
        document.body.classList.remove('no-scroll');
        document.body.classList.add('show-content');
        updateHeaderHeightVar();
        return;
      }

      title.addEventListener('animationend', () => {
        // reduce intro to 40vh (still fixed)
        intro.classList.add('intro--collapse');

        const onCollapseEnd = (ev) => {
          if (ev.propertyName && !/height|max-height/.test(ev.propertyName)) return;

          requestAnimationFrame(() => {
            // basculer dans le flux
            switchIntroToInFlow();
            revealContent();
          });

          intro.removeEventListener('transitionend', onCollapseEnd);
        };

        intro.addEventListener('transitionend', onCollapseEnd);

        // Fallback si transitionend ne fire pas
        setTimeout(() => {
          if (!document.body.classList.contains('intro-in-flow')){
            switchIntroToInFlow();
            revealContent();
          }
        }, 1200);
      });

      // Fallback global
      const globalFallback = 6000;
      setTimeout(()=>{
        if (!document.body.classList.contains('show-content')){
          intro.classList.add('intro--collapse');
          intro.classList.add('intro--inflow');
          document.body.classList.add('intro-in-flow');
          document.documentElement.classList.remove('no-scroll');
          document.body.classList.remove('no-scroll');
          revealContent();
        }
      }, globalFallback);
    })();

    // ========== Responsive nav handlers ==========
    if (navToggle) {
      navToggle.addEventListener('click', (e) => {
        const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
        setMobileNavOpen(!isOpen);
      });
    }

    // Close mobile nav when clicking a link inside it (useful on mobile)
    if (mobileNav) {
      mobileNav.addEventListener('click', (e) => {
        const target = e.target;
        if (target.tagName === 'A') {
          setMobileNavOpen(false);
        }
      });
    }

    // Global handlers
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('keydown', handleKeydown);

    // Ensure header-height var available once DOM is ready and header visible
    window.addEventListener('load', () => {
      // give a tick to let header render, then update
      requestAnimationFrame(updateHeaderHeightVar);
    });

    // Also ensure the header variable is updated when header becomes visible (body.show-content)
    const observer = new MutationObserver(() => {
      if (document.body.classList.contains('show-content')) {
        // compute after the header animation
        setTimeout(updateHeaderHeightVar, 60);
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });