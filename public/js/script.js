(() => {
  "use strict";
  var forms = document.querySelectorAll(".needs-validation");
  Array.prototype.slice.call(forms).forEach(function (form) {
    form.addEventListener(
      "submit",
      function (event) {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }
        form.classList.add("was-validated");
      },
      false
    );
  });
})();

// Safe taxSwitch toggle
let taxSwitch = document.getElementById("flexSwitchCheckDefault");
if (taxSwitch) {
  taxSwitch.addEventListener("click", () => {
    let taxInfo = document.getElementsByClassName("tax-info");
    for (let info of taxInfo) {
      if (info.style.display != "inline") {
        info.style.display = "inline";
      } else {
        info.style.display = "none";
      }
    }
  });
}

// Category filter list scroll buttons
document.addEventListener("DOMContentLoaded", function () {
  const leftBtn = document.querySelector(".left-btn");
  const rightBtn = document.querySelector(".right-btn");
  const filtersContainer = document.getElementById("filters-container");

  if (leftBtn && rightBtn && filtersContainer) {
    const filterItem = document.querySelector(".filter");
    const filterWidth = filterItem ? filterItem.offsetWidth + 32 : 120;

    leftBtn.addEventListener("click", function () {
      filtersContainer.scrollLeft -= filterWidth;
    });

    rightBtn.addEventListener("click", function () {
      filtersContainer.scrollLeft += filterWidth;
    });
  }
});

// Category filters touch scroll
document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("filters-container");
  if (container) {
    let startX;
    let scrollLeft;

    container.addEventListener("touchstart", (e) => {
      startX = e.touches[0].pageX;
      scrollLeft = container.scrollLeft;
    }, { passive: true });

    container.addEventListener("touchmove", (e) => {
      const x = e.touches[0].pageX;
      const walk = startX - x;
      container.scrollLeft = scrollLeft + walk;
    }, { passive: true });
  }
});

