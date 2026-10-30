/* Native-first navigation enhancements for the portfolio. */
(() => {
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
      if (link.hash === `#${sectionId}`) {
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
