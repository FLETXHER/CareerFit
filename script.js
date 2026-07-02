(function () {
  const navLinks = Array.from(document.querySelectorAll(".top-nav a"));
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const setActiveNav = () => {
    const offset = window.scrollY + 120;
    let activeId = sections[0] ? sections[0].id : "";

    sections.forEach((section) => {
      if (section.offsetTop <= offset) {
        activeId = section.id;
      }
    });

    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${activeId}`);
    });
  };

  const priorityButtons = Array.from(document.querySelectorAll(".filter-btn"));
  const priorityRows = Array.from(document.querySelectorAll("#priorityTable tbody tr"));

  priorityButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selected = button.dataset.priority;

      priorityButtons.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");

      priorityRows.forEach((row) => {
        const shouldShow = selected === "all" || row.dataset.priority === selected;
        row.hidden = !shouldShow;
      });
    });
  });

  const tabs = Array.from(document.querySelectorAll(".tab"));
  const panels = Array.from(document.querySelectorAll(".wireframe-panel"));

  const activateWireframePanel = (targetTab) => {
    const panelName = targetTab.dataset.panel;

    tabs.forEach((item) => {
      const isActive = item === targetTab;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-selected", String(isActive));
      item.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.id === `panel-${panelName}`);
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activateWireframePanel(tab);
    });

    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();

      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (tabs.indexOf(tab) + direction + tabs.length) % tabs.length;
      tabs[nextIndex].focus();
      activateWireframePanel(tabs[nextIndex]);
    });
  });

  const topButton = document.querySelector(".back-to-top");

  if (topButton) {
    topButton.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const updateBackToTop = () => {
    if (topButton) {
      topButton.classList.toggle("is-visible", window.scrollY > 600);
    }
  };

  window.addEventListener("scroll", () => {
    setActiveNav();
    updateBackToTop();
  }, { passive: true });

  const initialTab = tabs.find((tab) => tab.classList.contains("is-active"));
  if (initialTab) {
    activateWireframePanel(initialTab);
  }

  setActiveNav();
  updateBackToTop();
})();
