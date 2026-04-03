const tooltip     = document.getElementById("pokemon-tooltip");
const tooltipGif  = document.getElementById("tooltip-gif");
const tooltipName = document.getElementById("tooltip-name");
const tooltipText = document.getElementById("tooltip-text");

let hoverTimer = null;

export function attachTooltip(el, { name, gif, html, delay = 900 }) {
  el.addEventListener("mouseenter", () => {
    hoverTimer = setTimeout(() => {
      tooltipName.textContent = name;
      tooltipGif.src = gif || "";
      tooltipText.innerHTML = html || "";
      tooltip.classList.add("show");
    }, delay);
  });

  el.addEventListener("mouseleave", () => {
    clearTimeout(hoverTimer);
    tooltip.classList.remove("show");
  });
}

export function hideTooltip() {
  clearTimeout(hoverTimer);
  tooltip.classList.remove("show");
}