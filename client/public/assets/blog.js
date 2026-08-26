(function () {
  "use strict";

  function init(root) {
    var track = root.querySelector("[data-carousel-track]");
    var prev = root.querySelector("[data-carousel-prev]");
    var next = root.querySelector("[data-carousel-next]");
    if (!track || !prev || !next) return;

    function step() {
      // pick the first card child of whichever inner grid is mounted inside the track
      var card = track.querySelector(
        ".post-grid--carousel > *, .destination-grid--carousel > *"
      );
      var cardWidth = card ? card.getBoundingClientRect().width : 0;
      var styles = card
        ? getComputedStyle(track.querySelector(".post-grid--carousel, .destination-grid--carousel") || track)
        : null;
      var gap = styles ? parseFloat(styles.columnGap || styles.gap || "0") : 22;
      return cardWidth + (gap || 22);
    }

    function update() {
      var atStart = track.scrollLeft <= 2;
      var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      prev.disabled = atStart;
      next.disabled = atEnd;
    }

    prev.addEventListener("click", function () {
      track.scrollBy({ left: -step(), behavior: "smooth" });
    });
    next.addEventListener("click", function () {
      track.scrollBy({ left: step(), behavior: "smooth" });
    });
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
  }

  function initAll() {
    document.querySelectorAll("[data-carousel]").forEach(init);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
