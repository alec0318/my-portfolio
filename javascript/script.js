/* Native-first navigation enhancements for the portfolio. */
(() => {
  const desktopDrawer = document.querySelector(".desktop-drawer");
  const desktopSidebar = desktopDrawer?.querySelector(".sidebar");
  const sidebarToggle = desktopDrawer?.querySelector(".sidebar-toggle");

  if (desktopDrawer && desktopSidebar && sidebarToggle) {
    let pointerInside = false;
    let focusWithinSidebar = false;
    let pinnedOpen = false;
    let keyboardNavigation = false;
    let suppressHover = false;

    function isDrawerOpen() {
      return pinnedOpen || focusWithinSidebar || (pointerInside && !suppressHover);
    }

    function updateDrawer() {
      const open = isDrawerOpen();
      desktopDrawer.classList.toggle("is-open", open);
      desktopSidebar.inert = !open;
      sidebarToggle.setAttribute("aria-expanded", String(open));
      sidebarToggle.setAttribute("aria-label", open ? "Hide navigation" : "Show navigation");
    }

    desktopDrawer.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "mouse") return;
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
      if (!desktopSidebar.contains(event.target) || !keyboardNavigation) return;
      focusWithinSidebar = true;
      pinnedOpen = false;
      updateDrawer();
    });

    desktopDrawer.addEventListener("focusout", (event) => {
      if (!desktopSidebar.contains(event.target)) return;
      if (event.relatedTarget && desktopSidebar.contains(event.relatedTarget)) return;
      focusWithinSidebar = false;
      updateDrawer();
    });

    sidebarToggle.addEventListener("click", () => {
      pinnedOpen = !pinnedOpen;
      updateDrawer();
    });

    document.addEventListener("pointerdown", (event) => {
      keyboardNavigation = false;
      focusWithinSidebar = false;
      if (pinnedOpen && !desktopDrawer.contains(event.target)) pinnedOpen = false;
      updateDrawer();
    }, true);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Tab") keyboardNavigation = true;
      if (event.key !== "Escape" || !isDrawerOpen()) return;

      event.preventDefault();
      pinnedOpen = false;
      focusWithinSidebar = false;
      suppressHover = pointerInside;
      updateDrawer();
      sidebarToggle.focus();
    });

    for (const link of desktopSidebar.querySelectorAll('a[href^="#"]')) {
      link.addEventListener("click", () => {
        pinnedOpen = false;
        updateDrawer();
      });
    }
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

  // Keep both navigation menus' current-section state in sync while scrolling.
  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top
          );

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

  // Close the native dropdown after choosing a destination and return focus
  // to its summary so keyboard users have a predictable focus location.
  mobileMenu.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    mobileMenu.open = false;
    requestAnimationFrame(() => mobileMenuSummary.focus({ preventScroll: true }));
  });

  // Escape closes the open dropdown and leaves focus on its control.
  mobileMenu.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !mobileMenu.open) return;

    event.preventDefault();
    mobileMenu.open = false;
    mobileMenuSummary.focus();
  });
})();
