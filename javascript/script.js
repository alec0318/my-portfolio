/* Native-first navigation and theme enhancements for the portfolio. */
(() => {
  const root = document.documentElement;
  const themeButtons = Array.from(document.querySelectorAll("[data-theme-toggle]"));
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const themeStorageKey = "alejandro-portfolio-theme";
  const colorSchemePreference = window.matchMedia?.("(prefers-color-scheme: dark)");

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
    const nextIcon = nextTheme === "dark" ? "☾" : "☀";

    for (const button of themeButtons) {
      button.setAttribute("aria-label", "Switch to " + nextTheme + " mode");
      const label = button.querySelector(".theme-label");
      const icon = button.querySelector(".theme-icon");
      if (label) label.textContent = nextLabel;
      if (icon) icon.textContent = nextIcon;
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
  const mobileMenu = document.querySelector(".mobile-nav");
  const mobileMenuSummary = mobileMenu?.querySelector("summary");

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

  if (!mobileMenu || !mobileMenuSummary) return;

  mobileMenu.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    mobileMenu.open = false;
    requestAnimationFrame(() => mobileMenuSummary.focus({ preventScroll: true }));
  });

  mobileMenu.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !mobileMenu.open) return;

    event.preventDefault();
    mobileMenu.open = false;
    mobileMenuSummary.focus();
  });
})();
