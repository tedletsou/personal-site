window.addEventListener("load", () => {
  document.body.classList.add("is-ready");
});

function setupFontScramble(target) {
  const fontPool = [
    "\"Archivo\", sans-serif",
    "\"IBM Plex Sans\", sans-serif",
    "\"Manrope\", sans-serif",
    "\"Space Grotesk\", sans-serif",
    "\"Inter\", sans-serif",
  ];
  const settledFont = "\"Inter\", sans-serif";
  const shouldRunContinuously = target.classList.contains("js-hero-font-scramble");

  const chars = [];
  const lineNodes = target.querySelectorAll(".hero__title-line, .page-title__line");
  const targetStyle = window.getComputedStyle(target);
  const fontSize = targetStyle.fontSize;
  const fontWeight = targetStyle.fontWeight;
  const letterSpacing = parseFloat(targetStyle.letterSpacing || "0");

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  lineNodes.forEach((line) => {
    const text = line.textContent || "";
    const fragment = document.createDocumentFragment();

    line.textContent = "";

    for (const char of text) {
      if (char === " ") {
        fragment.appendChild(document.createTextNode(char));
        continue;
      }

      const span = document.createElement("span");
      span.className = "hero-scramble-char";
      span.textContent = char;

      if (context) {
        let maxWidth = 0;
        fontPool.forEach((font) => {
          context.font = `${fontWeight} ${fontSize} ${font}`;
          maxWidth = Math.max(maxWidth, context.measureText(char).width);
        });
        span.style.width = `${Math.ceil(maxWidth + Math.max(letterSpacing, 0))}px`;
      }

      chars.push(span);
      fragment.appendChild(span);
    }

    line.appendChild(fragment);
  });

  const lockBox = () => {
    target.style.width = `${Math.ceil(target.getBoundingClientRect().width)}px`;
    target.style.height = `${Math.ceil(target.getBoundingClientRect().height)}px`;
  };

  lockBox();

  function tick(unsettledChars = chars) {
    let previousFont = "";
    unsettledChars.forEach((char) => {
      const available = fontPool.filter((font) => font !== previousFont);
      const nextFont =
        available[Math.floor(Math.random() * available.length)] || settledFont;
      char.style.fontFamily = nextFont;
      previousFont = nextFont;
    });
  }

  function settle() {
    chars.forEach((char) => {
      char.style.fontFamily = settledFont;
    });
  }

  tick();
  if (shouldRunContinuously) {
    window.setInterval(tick, 140);
    return;
  }

  const unsettledChars = [...chars];
  const randomPhaseId = window.setInterval(() => {
    tick();
  }, 140);

  window.setTimeout(() => {
    window.clearInterval(randomPhaseId);

    const settlePhaseId = window.setInterval(() => {
      tick(unsettledChars);

      if (!unsettledChars.length) {
        window.clearInterval(settlePhaseId);
        settle();
        return;
      }

      const remainingRatio = unsettledChars.length / chars.length;
      const settleCount = remainingRatio > 0.66 ? 1 : remainingRatio > 0.33 ? 2 : 3;

      for (let index = 0; index < settleCount && unsettledChars.length; index += 1) {
        const settleIndex = Math.floor(Math.random() * unsettledChars.length);
        const [settledChar] = unsettledChars.splice(settleIndex, 1);
        if (settledChar) {
          settledChar.style.fontFamily = settledFont;
        }
      }

      if (!unsettledChars.length) {
        window.clearInterval(settlePhaseId);
        settle();
      }
    }, 140);
  }, 3000);
}

document
  .querySelectorAll(".js-hero-font-scramble, .js-font-scramble")
  .forEach((target) => setupFontScramble(target));

const PUBLICATION_EXPANDED_HEIGHT = 124;
const NEWS_EXPANDED_HEIGHT = 180;
const FEATURE_EXPANDED_HEIGHT = 280;
const PHOTO_EXPANDED_HEIGHT = 520;
const OVERLAY_EXPANDED_HEIGHT = 760;
const OVERLAY_EXPANDED_TOP_MARGIN = 12;

function runWithViewTransition(callback) {
  if (!document.startViewTransition) {
    callback();
    return;
  }

  document.startViewTransition(() => {
    callback();
  });
}

function setPublicationOpenState(card, shouldOpen) {
  const details = card.querySelector(".js-publication-details");
  const controls = card.querySelectorAll(".js-publication-toggle, .js-publication-surface");
  const authors = card.querySelector(".js-publication-authors");
  const button = card.querySelector(".js-publication-toggle");

  if (!details || !controls || !authors) {
    return;
  }

  if (!shouldOpen) {
    details.style.maxHeight = `${PUBLICATION_EXPANDED_HEIGHT}px`;
    requestAnimationFrame(() => {
      card.classList.remove("is-open");
      controls.forEach((control) => control.setAttribute("aria-expanded", "false"));
      authors.textContent = authors.getAttribute("data-short-authors") || authors.textContent;
      if (button) {
        button.textContent = "+";
      }
      details.style.maxHeight = "0px";
      window.setTimeout(() => {
        if (!card.classList.contains("is-open")) {
          details.hidden = true;
        }
      }, 340);
    });
    return;
  }

  details.hidden = false;
  card.classList.add("is-open");
  controls.forEach((control) => control.setAttribute("aria-expanded", "true"));
  authors.textContent = authors.getAttribute("data-full-authors") || authors.textContent;
  if (button) {
    button.textContent = "-";
  }
  requestAnimationFrame(() => {
    details.style.maxHeight = `${PUBLICATION_EXPANDED_HEIGHT}px`;
  });
}

document.addEventListener("click", (event) => {
  const toggle = event.target.closest(".js-publication-toggle, .js-publication-surface");
  if (!toggle) {
    return;
  }

  const card = toggle.closest(".js-publication-card");
  if (!card) {
    return;
  }

  const isOpen = card.classList.contains("is-open");
  runWithViewTransition(() => {
    setPublicationOpenState(card, !isOpen);
  });
});

const publicationFilters = document.querySelectorAll(".publication-filter");
const publicationYearSelect = document.querySelector(".publication-year-select");
const publicationCards = document.querySelectorAll(".js-publication-card");

function applyPublicationFilters() {
  if (!publicationCards.length) {
    return;
  }

  const activeFilter =
    document.querySelector(".publication-filter.is-active")?.getAttribute("data-theme") || "all";
  const activeYear = publicationYearSelect?.value || "all";

  publicationCards.forEach((card) => {
    const matchesTheme =
      activeFilter === "all" || (card.dataset.themes || "").split(" ").includes(activeFilter);
    const matchesYear = activeYear === "all" || card.dataset.year === activeYear;
    const shouldShow = matchesTheme && matchesYear;

    if (!shouldShow && card.classList.contains("is-open")) {
      setPublicationOpenState(card, false);
    }

    card.classList.toggle("is-hidden", !shouldShow);
  });
}

publicationFilters.forEach((filter) => {
  filter.addEventListener("click", () => {
    runWithViewTransition(() => {
      publicationFilters.forEach((button) => button.classList.remove("is-active"));
      filter.classList.add("is-active");
      applyPublicationFilters();
    });
  });
});

if (publicationYearSelect) {
  publicationYearSelect.addEventListener("change", () => {
    runWithViewTransition(applyPublicationFilters);
  });
}

applyPublicationFilters();

function setNewsOpenState(card, shouldOpen) {
  const details = card.querySelector(".js-news-details");
  const controls = card.querySelectorAll(".js-news-toggle, .js-news-surface");
  const button = card.querySelector(".js-news-toggle");

  if (!details || !controls.length) {
    return;
  }

  if (!shouldOpen) {
    details.style.maxHeight = `${NEWS_EXPANDED_HEIGHT}px`;
    requestAnimationFrame(() => {
      card.classList.remove("is-open");
      controls.forEach((control) => control.setAttribute("aria-expanded", "false"));
      if (button) {
        button.textContent = "+";
      }
      details.style.maxHeight = "0px";
      window.setTimeout(() => {
        if (!card.classList.contains("is-open")) {
          details.hidden = true;
        }
      }, 340);
    });
    return;
  }

  details.hidden = false;
  card.classList.add("is-open");
  controls.forEach((control) => control.setAttribute("aria-expanded", "true"));
  if (button) {
    button.textContent = "-";
  }
  requestAnimationFrame(() => {
    details.style.maxHeight = `${NEWS_EXPANDED_HEIGHT}px`;
  });
}

document.addEventListener("click", (event) => {
  const toggle = event.target.closest(".js-news-toggle, .js-news-surface");
  if (!toggle) {
    return;
  }

  const card = toggle.closest(".js-news-card");
  if (!card) {
    return;
  }

  const isOpen = card.classList.contains("is-open");
  runWithViewTransition(() => {
    setNewsOpenState(card, !isOpen);
  });
});

const newsCarouselTrack = document.querySelector(".js-news-carousel-track");
const newsCarouselPrev = document.querySelector(".js-news-carousel-prev");
const newsCarouselNext = document.querySelector(".js-news-carousel-next");

if (newsCarouselTrack && newsCarouselPrev && newsCarouselNext) {
  const newsItems = Array.from(newsCarouselTrack.children);
  let newsIndex = 0;

  const getVisibleNewsCount = () => {
    if (window.innerWidth <= 760) {
      return 1;
    }
    return 3;
  };

  const updateNewsCarousel = () => {
    const visibleCount = getVisibleNewsCount();
    const maxIndex = Math.max(0, newsItems.length - visibleCount);
    newsIndex = Math.min(newsIndex, maxIndex);

    const firstItem = newsItems[0];
    if (!firstItem) {
      return;
    }

    const itemStyles = window.getComputedStyle(newsCarouselTrack);
    const gap = parseFloat(itemStyles.columnGap || itemStyles.gap || "0");
    const offset = newsIndex * (firstItem.getBoundingClientRect().width + gap);

    newsCarouselTrack.style.transform = `translateX(${-offset}px)`;
    newsCarouselPrev.disabled = newsIndex === 0;
    newsCarouselNext.disabled = newsIndex >= maxIndex;
  };

  newsCarouselPrev.addEventListener("click", () => {
    newsIndex -= 1;
    updateNewsCarousel();
  });

  newsCarouselNext.addEventListener("click", () => {
    newsIndex += 1;
    updateNewsCarousel();
  });

  window.addEventListener("resize", updateNewsCarousel);
  window.requestAnimationFrame(updateNewsCarousel);
}

function setFeatureOpenState(card, shouldOpen) {
  const details = card.querySelector(".js-feature-details");
  const controls = card.querySelectorAll(".js-feature-surface");

  if (!details || !controls.length) {
    return;
  }

  if (!shouldOpen) {
    details.style.maxHeight = `${FEATURE_EXPANDED_HEIGHT}px`;
    requestAnimationFrame(() => {
      card.classList.remove("is-open");
      controls.forEach((control) => control.setAttribute("aria-expanded", "false"));
      details.style.maxHeight = "0px";
      window.setTimeout(() => {
        if (!card.classList.contains("is-open")) {
          details.hidden = true;
        }
      }, 340);
    });
    return;
  }

  details.hidden = false;
  card.classList.add("is-open");
  controls.forEach((control) => control.setAttribute("aria-expanded", "true"));
  requestAnimationFrame(() => {
    details.style.maxHeight = `${FEATURE_EXPANDED_HEIGHT}px`;
  });
}

function isPhotoFeatureCard(card) {
  return Boolean(card.closest(".feature-grid--overlay"));
}

function getPhotoFeatureGroup(card) {
  return card.closest(".feature-grid--overlay");
}

function setPhotoFeatureOpenState(card, shouldOpen) {
  const details = card.querySelector(".js-feature-details");
  const controls = card.querySelectorAll(".js-feature-surface");
  const group = getPhotoFeatureGroup(card);
  let placeholder = card.nextElementSibling;

  if (!details || !controls.length || !group) {
    return;
  }

  if (!shouldOpen) {
    const targetLeft = card.dataset.closedLeft;
    const targetTop = card.dataset.closedTop;
    const targetWidth = card.dataset.closedWidth;
    const targetHeight = card.dataset.closedHeight;

    controls.forEach((control) => control.setAttribute("aria-expanded", "false"));
    details.style.opacity = "0";
    details.style.maxHeight = "0px";
    details.style.paddingBottom = "0px";
    card.classList.remove("is-open");

    if (targetLeft && targetTop && targetWidth && targetHeight) {
      card.style.left = `${targetLeft}px`;
      card.style.top = `${targetTop}px`;
      card.style.width = `${targetWidth}px`;
      card.style.height = `${targetHeight}px`;
    }

    window.setTimeout(() => {
      details.hidden = true;
      details.style.opacity = "";
      details.style.maxHeight = "";
      details.style.paddingBottom = "";
      card.style.position = "";
      card.style.left = "";
      card.style.top = "";
      card.style.width = "";
      card.style.height = "";
      card.style.zIndex = "";
      delete card.dataset.closedLeft;
      delete card.dataset.closedTop;
      delete card.dataset.closedWidth;
      delete card.dataset.closedHeight;
      if (placeholder?.classList.contains("feature-card-placeholder")) {
        placeholder.remove();
      }
      group.classList.remove("has-open");
      group.style.minHeight = "";
    }, 360);

    return;
  }

  const groupRect = group.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const closedLeft = cardRect.left - groupRect.left;
  const closedTop = cardRect.top - groupRect.top;
  const siteHeader = document.querySelector(".site-header");
  const headerBottom = siteHeader?.getBoundingClientRect().bottom || 0;
  const usableTop = Math.max(OVERLAY_EXPANDED_TOP_MARGIN, headerBottom - 56);
  const usableBottom = window.innerHeight - 24;
  const usableHeight = Math.max(usableBottom - usableTop, OVERLAY_EXPANDED_HEIGHT);
  const targetTopInViewport = usableTop + (usableHeight - OVERLAY_EXPANDED_HEIGHT) / 2;
  const centeredTop = targetTopInViewport - groupRect.top;

  card.dataset.closedLeft = String(closedLeft);
  card.dataset.closedTop = String(closedTop);
  card.dataset.closedWidth = String(cardRect.width);
  card.dataset.closedHeight = String(cardRect.height);

  if (!placeholder || !placeholder.classList.contains("feature-card-placeholder")) {
    placeholder = document.createElement("div");
    placeholder.className = "feature-card-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    card.insertAdjacentElement("afterend", placeholder);
  }

  placeholder.style.width = `${cardRect.width}px`;
  placeholder.style.height = `${cardRect.height}px`;

  group.classList.add("has-open");
  group.style.minHeight = "";

  card.style.position = "absolute";
  card.style.left = `${closedLeft}px`;
  card.style.top = `${closedTop}px`;
  card.style.width = `${cardRect.width}px`;
  card.style.height = `${cardRect.height}px`;
  card.style.zIndex = "4";

  details.hidden = false;
  details.style.opacity = "0";
  details.style.maxHeight = "0px";
  details.style.paddingBottom = "0px";
  card.classList.add("is-open");
  controls.forEach((control) => control.setAttribute("aria-expanded", "true"));

  requestAnimationFrame(() => {
    card.style.left = "0px";
    card.style.top = `${Math.round(centeredTop)}px`;
    card.style.width = `${group.clientWidth}px`;
    card.style.height = `${OVERLAY_EXPANDED_HEIGHT}px`;
    details.style.opacity = "1";
    details.style.maxHeight = "370px";
    details.style.paddingBottom = "20px";
  });
}

document.addEventListener("click", (event) => {
  const toggle = event.target.closest(".js-feature-surface");
  if (!toggle) {
    return;
  }

  const card = toggle.closest(".js-feature-card");
  if (!card) {
    return;
  }

  const group = card.parentElement?.querySelectorAll(".js-feature-card") || [];

  if (isPhotoFeatureCard(card)) {
    group.forEach((item) => {
      if (item !== card && item.classList.contains("is-open")) {
        setPhotoFeatureOpenState(item, false);
      }
    });

    const shouldOpen = !card.classList.contains("is-open");
    setPhotoFeatureOpenState(card, shouldOpen);
    return;
  }

  runWithViewTransition(() => {
    group.forEach((item) => {
      setFeatureOpenState(item, item === card);
    });
  });
});
