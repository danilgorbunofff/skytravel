/* SkyTravel blog — progressive enhancement only.
   The blog is fully usable without this file. */
(function () {
  var buttons = document.querySelectorAll("[data-copy-url]");
  if (!buttons.length || !navigator.clipboard) return;

  function copy(text) {
    if (navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return Promise.reject(new Error("unsupported"));
  }

  Array.prototype.forEach.call(buttons, function (button) {
    button.hidden = false;
    button.addEventListener("click", function () {
      copy(location.origin + button.getAttribute("data-copy-url"))
        .then(function () {
          button.textContent = "Odkaz zkopírován";
          button.classList.add("is-done");
          setTimeout(function () {
            button.textContent = "Kopírovat odkaz";
            button.classList.remove("is-done");
          }, 2200);
        })
        .catch(function () {
          button.hidden = true;
        });
    });
  });
})();
