/* Native-first navigation and theme enhancements for the portfolio. */
(() => {
  const root = document.documentElement;
  const themeButtons = Array.from(document.querySelectorAll("[data-theme-toggle]"));
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const themeStorageKey = "alejandro-portfolio-theme";
  const colorSchemePreference = window.matchMedia?.("(prefers-color-scheme: dark)");
  const reducedMotionPreference = window.matchMedia?.("(prefers-reduced-motion: reduce)");

  function readSavedTheme() {
    try {
      const value = window.localStorage.getItem(themeStorageKey);
      return value === "light" || value === "dark" ? value : null;
    } catch {
      return null;
    }
  }

  let savedTheme = readSavedTheme();
  let activeTheme = savedTheme || (colorSchemePreference?.matches ? "dark" : "light");

  function applyTheme(theme, persist = false) {
    activeTheme = theme === "dark" ? "dark" : "light";
    root.dataset.theme = activeTheme;
    root.style.colorScheme = activeTheme;

    const nextTheme = activeTheme === "dark" ? "light" : "dark";
    const nextLabel = nextTheme === "dark" ? "Dark mode" : "Light mode";

    for (const button of themeButtons) {
      button.dataset.themeTarget = nextTheme;
      button.setAttribute("aria-label", "Switch to " + nextTheme + " mode");
      const label = button.querySelector(".theme-label");
      if (label) label.textContent = nextLabel;
    }

    if (themeMeta) {
      themeMeta.content = getComputedStyle(root).getPropertyValue("--color-background").trim();
    }

    if (persist) {
      try {
        window.localStorage.setItem(themeStorageKey, activeTheme);
        savedTheme = activeTheme;
      } catch {
        // The selected theme remains active for this page view if storage is unavailable.
      }
    }
  }

  applyTheme(activeTheme);

  for (const button of themeButtons) {
    button.addEventListener("click", () => {
      applyTheme(activeTheme === "dark" ? "light" : "dark", true);
    });
  }

  colorSchemePreference?.addEventListener("change", (event) => {
    if (savedTheme) return;
    applyTheme(event.matches ? "dark" : "light");
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== themeStorageKey) return;
    if (event.newValue === "dark" || event.newValue === "light") {
      savedTheme = event.newValue;
      applyTheme(savedTheme);
    } else if (event.newValue === null) {
      savedTheme = null;
      applyTheme(colorSchemePreference?.matches ? "dark" : "light");
    }
  });

  // Background marks: random positions and sizes on every visit, sorted into four depth layers.
  // Small marks sit in the slow back layer, large ones in the faster front layer (subtle parallax).
  // CSS floats each layer gently (transform); this script eases each layer's `translate` toward its
  // scroll and sidebar targets, so motion decelerates instead of stopping dead.
  const pattern = document.querySelector(".canvas-pattern");
  const layers = pattern ? Array.from(pattern.children) : [];
  const layerSpeeds = [0.03, 0.06, 0.1, 0.14];
  // Share of the cards' sidebar shift each layer follows: back layers lag, the front layer nearly keeps pace.
  const sidebarFollow = [0.35, 0.5, 0.7, 0.9];
  // Easing time constants (ms; ~95% settled after 3x): scroll glides, sidebar keeps pace with its 260ms slide.
  const easeTimeY = 140;
  const easeTimeX = 85;
  const minMarkSize = 12;
  const maxMarkSize = 36;
  const shell = document.querySelector(".site-shell");
  const cards = document.querySelector("main");
  const current = layers.map(() => ({ x: 0, y: 0 }));
  let parallaxActive = false;
  let maxScroll = 0;
  let sidebarShift = 0;
  let sidebarOpen = false;
  let cardsClosedLeft = 0;
  let trackCardsUntil = 0;
  let easing = false;
  let lastFrame = 0;

  function placeMarks() {
    // Layers extend past the left edge so the sidebar shift never exposes an empty strip.
    const bleed = -(layers[0].offsetLeft || 0);
    const width = window.innerWidth + bleed;
    const height = window.innerHeight;
    // Each layer is tall enough to cover the viewport after its full parallax travel.
    const layerHeights = layerSpeeds.map((speed) => height + (parallaxActive ? maxScroll * speed : 0));
    const placed = [];
    const count = Math.min(80, Math.round((width * layerHeights[3]) / 24000));

    for (const layer of layers) layer.replaceChildren();

    for (let i = 0; i < count; i += 1) {
      const size = minMarkSize + Math.random() ** 1.6 * (maxMarkSize - minMarkSize);
      const depth = Math.min(3, Math.floor(((size - minMarkSize) / (maxMarkSize - minMarkSize)) * 4));
      const boxWidth = size * 2.6;
      const gap = size * 0.9;
      // Rejection sampling: retry until the mark clears every mark already placed (at scroll 0).
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const x = Math.random() * (width - boxWidth * 0.5) - boxWidth * 0.25;
        const y = Math.random() * layerHeights[depth] - size * 0.5;
        const clear = placed.every((mark) =>
          x > mark.x + mark.w + gap || x + boxWidth + gap < mark.x ||
          y > mark.y + mark.h + gap || y + size + gap < mark.y
        );
        if (!clear) continue;
        placed.push({ x, y, w: boxWidth, h: size, depth });
        const mark = document.createElement("i");
        mark.textContent = "<AC>";
        mark.style.cssText = `left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;font-size:${size.toFixed(1)}px`;
        layers[depth].append(mark);
        break;
      }
    }

    layers.forEach((layer, index) => { layer.style.height = `${layerHeights[index].toFixed(0)}px`; });
  }

  function targetOf(index) {
    const scroll = Math.min(Math.max(window.scrollY, 0), maxScroll);
    return { x: sidebarShift * sidebarFollow[index], y: -scroll * layerSpeeds[index] };
  }

  function writeLayer(index) {
    layers[index].style.translate = `${current[index].x.toFixed(1)}px ${current[index].y.toFixed(1)}px`;
  }

  // One rAF loop that runs only while some layer is still catching up, then stops.
  function easeLayers(now) {
    const dt = lastFrame ? Math.min(now - lastFrame, 64) : 16;
    lastFrame = now;
    const stepX = 1 - Math.exp(-dt / easeTimeX);
    const stepY = 1 - Math.exp(-dt / easeTimeY);
    // While the sidebar slides, follow the cards' real offset (it isn't a fixed fraction of the sidebar).
    const tracking = now < trackCardsUntil;
    if (tracking && cards) sidebarShift = cards.getBoundingClientRect().left - cardsClosedLeft;
    let moving = tracking;
    layers.forEach((layer, index) => {
      const target = targetOf(index);
      const position = current[index];
      position.x += (target.x - position.x) * stepX;
      position.y += (target.y - position.y) * stepY;
      if (Math.abs(target.x - position.x) < 0.1 && Math.abs(target.y - position.y) < 0.1) {
        position.x = target.x;
        position.y = target.y;
      } else {
        moving = true;
      }
      writeLayer(index);
    });
    if (moving) {
      window.requestAnimationFrame(easeLayers);
    } else {
      easing = false;
      lastFrame = 0;
    }
  }

  function startEasing() {
    if (!parallaxActive || easing) return;
    easing = true;
    window.requestAnimationFrame(easeLayers);
  }

  function snapLayers() {
    layers.forEach((layer, index) => {
      current[index] = targetOf(index);
      writeLayer(index);
    });
  }

  function syncSidebarShift() {
    const open = Boolean(shell?.classList.contains("is-sidebar-open"));
    if (open === sidebarOpen) return;
    sidebarOpen = open;
    // The padding transition hasn't started yet, so this reads the cards' closed position.
    // shortcut: a window resize while the sidebar stays open keeps the old offset until it closes; fine for a hover drawer.
    if (open && cards) cardsClosedLeft = cards.getBoundingClientRect().left;
    trackCardsUntil = performance.now() + 400; // covers the 260ms slide
    startEasing();
  }

  // Reshuffle only when the width changes or the layers no longer cover the page; height-only changes
  // (mobile URL bar) keep the current marks so nothing jumps mid-scroll.
  let lastLayout = "";
  let coveredHeight = 0;
  function layoutPattern() {
    maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const layout = `${window.innerWidth}:${parallaxActive}`;
    const needed = window.innerHeight + (parallaxActive ? maxScroll * layerSpeeds[3] : 0);
    if (layout === lastLayout && needed <= coveredHeight + 80) return;
    lastLayout = layout;
    coveredHeight = needed;
    placeMarks();
    if (parallaxActive) snapLayers();
  }

  function syncPatternParallax() {
    const shouldEnable = !reducedMotionPreference?.matches;
    if (shouldEnable === parallaxActive && lastLayout) return;
    parallaxActive = shouldEnable;

    if (shouldEnable) {
      window.addEventListener("scroll", startEasing, { passive: true });
    } else {
      window.removeEventListener("scroll", startEasing);
      for (const layer of layers) layer.style.removeProperty("translate");
    }
    layoutPattern();
  }

  if (layers.length === layerSpeeds.length) {
    syncPatternParallax();
    reducedMotionPreference?.addEventListener("change", syncPatternParallax);
    if (shell) new MutationObserver(syncSidebarShift).observe(shell, { attributeFilter: ["class"] });
    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layoutPattern, 200);
    });
    // Page height settles after fonts and the portrait load.
    window.addEventListener("load", layoutPattern);
  }

  const siteShell = document.querySelector(".site-shell");
  const desktopDrawer = document.querySelector(".desktop-drawer");
  const desktopSidebar = desktopDrawer?.querySelector(".sidebar");
  const sidebarToggle = desktopDrawer?.querySelector(".sidebar-toggle");
  const mobileBreakpoint = window.matchMedia?.("(max-width: 50rem)");

  if (siteShell && desktopDrawer && desktopSidebar && sidebarToggle) {
    let pointerInside = false;
    let focusWithinDrawer = false;
    let pinnedOpen = false;
    let keyboardNavigation = false;
    let suppressHover = false;

    function isMobileLayout() {
      return mobileBreakpoint?.matches ?? window.innerWidth <= 800;
    }

    function isDrawerOpen() {
      return !isMobileLayout() && (
        pinnedOpen || focusWithinDrawer || (pointerInside && !suppressHover)
      );
    }

    function updateDrawer() {
      const open = isDrawerOpen();
      desktopDrawer.classList.toggle("is-open", open);
      siteShell.classList.toggle("is-sidebar-open", open);
      desktopSidebar.inert = !open;
      sidebarToggle.setAttribute("aria-expanded", String(open));
      sidebarToggle.setAttribute("aria-label", open ? "Hide navigation" : "Show navigation");
    }

    desktopDrawer.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "mouse" || isMobileLayout()) return;
      pointerInside = true;
      suppressHover = false;
      updateDrawer();
    });

    desktopDrawer.addEventListener("pointerleave", (event) => {
      if (event.pointerType !== "mouse") return;
      pointerInside = false;
      suppressHover = false;
      updateDrawer();
    });

    desktopDrawer.addEventListener("focusin", (event) => {
      if (!keyboardNavigation || isMobileLayout()) return;
      if (event.target !== sidebarToggle && !desktopSidebar.contains(event.target)) return;
      focusWithinDrawer = true;
      pinnedOpen = false;
      updateDrawer();
    });

    desktopDrawer.addEventListener("focusout", (event) => {
      if (event.relatedTarget && desktopDrawer.contains(event.relatedTarget)) return;
      focusWithinDrawer = false;
      updateDrawer();
    });

    sidebarToggle.addEventListener("click", () => {
      if (isMobileLayout()) return;
      pinnedOpen = !pinnedOpen;
      updateDrawer();
    });

    document.addEventListener("pointerdown", (event) => {
      keyboardNavigation = false;
      focusWithinDrawer = false;
      if (pinnedOpen && !desktopDrawer.contains(event.target)) pinnedOpen = false;
      updateDrawer();
    }, true);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Tab") keyboardNavigation = true;
      if (event.key !== "Escape" || !isDrawerOpen()) return;

      event.preventDefault();
      pinnedOpen = false;
      focusWithinDrawer = false;
      suppressHover = pointerInside;
      keyboardNavigation = false;
      updateDrawer();
      sidebarToggle.focus();
    });

    for (const link of desktopSidebar.querySelectorAll('a[href^="#"]')) {
      link.addEventListener("click", () => {
        pinnedOpen = false;
        updateDrawer();
      });
    }

    mobileBreakpoint?.addEventListener("change", () => {
      pointerInside = false;
      focusWithinDrawer = false;
      pinnedOpen = false;
      suppressHover = false;
      updateDrawer();
    });

    updateDrawer();
  }

  const sections = Array.from(document.querySelectorAll(".content section[id]"));
  const navigationLinks = Array.from(
    document.querySelectorAll(
      '.desktop-nav a[href^="#"], .mobile-nav a[href^="#"]'
    )
  );
  const mobileHeader = document.querySelector(".mobile-header");
  const mobileMenu = document.getElementById("mobile-menu");
  const mobileMenuToggle = mobileHeader?.querySelector(".mobile-menu-toggle");

  const revealTargets = Array.from(document.querySelectorAll("[data-reveal]"));

  if (
    revealTargets.length > 0 &&
    !reducedMotionPreference?.matches &&
    "IntersectionObserver" in window
  ) {
    root.classList.add("has-scroll-reveal");
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    const startReveal = () => {
      for (const target of revealTargets) revealObserver.observe(target);
    };
    // The inline head script sets has-page-entry-motion; cards wait until the intro has faded in.
    const introEntry = document.querySelector('[data-page-entry="intro"]');
    if (introEntry && root.classList.contains("has-page-entry-motion")) {
      let revealStarted = false;
      const startRevealOnce = () => {
        if (revealStarted) return;
        revealStarted = true;
        startReveal();
      };
      // animationcancel covers reduced motion being switched on mid-entrance.
      introEntry.addEventListener("animationend", startRevealOnce);
      introEntry.addEventListener("animationcancel", startRevealOnce);
    } else {
      startReveal();
    }
  }

  if (sections.length === 0 || navigationLinks.length === 0) return;

  function setCurrentSection(sectionId) {
    for (const link of navigationLinks) {
      if (link.hash === "#" + sectionId) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    }
  }

  function setCurrentSectionFromHash() {
    const sectionId = decodeURIComponent(window.location.hash.slice(1));
    if (sectionId && document.getElementById(sectionId)) {
      setCurrentSection(sectionId);
    }
  }

  setCurrentSectionFromHash();
  if (!window.location.hash) setCurrentSection("home");

  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visibleSections.length > 0) {
          setCurrentSection(visibleSections[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -65% 0px",
        threshold: 0,
      }
    );

    for (const section of sections) sectionObserver.observe(section);
  }

  window.addEventListener("hashchange", setCurrentSectionFromHash);

  for (const link of navigationLinks) {
    link.addEventListener("click", () => {
      const sectionId = decodeURIComponent(link.hash.slice(1));
      if (document.getElementById(sectionId)) {
        setCurrentSection(sectionId);
      }
    });
  }

  if (!mobileHeader || !mobileMenu || !mobileMenuToggle) return;

  function setMobileMenu(open) {
    mobileHeader.classList.toggle("is-open", open);
    mobileMenu.inert = !open;
    mobileMenuToggle.setAttribute("aria-expanded", String(open));
    mobileMenuToggle.textContent = open ? "Close" : "Menu";
    // Both share the same top-right anchor; open, the button floats 10px below the card.
    const offset = open ? mobileMenu.offsetHeight + 10 : 0;
    mobileMenuToggle.style.setProperty("--menu-offset", `${offset}px`);
  }

  const isMobileMenuOpen = () => mobileHeader.classList.contains("is-open");

  mobileMenuToggle.addEventListener("click", () => setMobileMenu(!isMobileMenuOpen()));

  mobileMenu.addEventListener("click", (event) => {
    if (!event.target.closest('a[href^="#"]')) return;
    setMobileMenu(false);
    requestAnimationFrame(() => mobileMenuToggle.focus({ preventScroll: true }));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isMobileMenuOpen()) return;
    event.preventDefault();
    setMobileMenu(false);
    mobileMenuToggle.focus();
  });

  // A tap outside the panel closes it.
  document.addEventListener("pointerdown", (event) => {
    if (isMobileMenuOpen() && !mobileHeader.contains(event.target)) setMobileMenu(false);
  });

  mobileBreakpoint?.addEventListener("change", () => setMobileMenu(false));
})();
