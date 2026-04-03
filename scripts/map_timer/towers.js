import { state } from "./state.js";
import { attachTooltip } from "./tooltip.js";
import { updateDisplay } from "./timer.js";
import { scaledSize } from "./scale.js";
import { addTowerKill } from "./tracker.js";

const towersContainer = document.getElementById("towers-container");

export function isTowerClickable(tower) {
  if (tower.destroyed) return false;
  if (!tower.requiresTowerBreak) return true;
  const required = Array.isArray(tower.requiresTowerBreak)
    ? tower.requiresTowerBreak
    : [tower.requiresTowerBreak];
  return required.every(id => state.towers.some(t => t.breakid === id && t.destroyed));
}

export function updateTowers() {
  state.towers.forEach(tower => {
    const clickable = isTowerClickable(tower);

    if (!tower.element) {
      const img = document.createElement("img");
      img.src = tower.destroyed ? tower.imgBroken : tower.img;
      img.classList.add("tower");
      img.style.left = `${tower.xPercent}%`;
      img.style.top  = `${tower.yPercent}%`;
      img.dataset.baseSize = 50;
      const sz = scaledSize(50);
      img.style.width  = `${sz}px`;
      img.style.height = `${sz}px`;
      img.title = tower.id;
      img.dataset.breakid = tower.breakid;

      attachTooltip(img, {
        name: tower.name || tower.id,
        gif: tower.img,
        html: (tower.info || "<p>No information available.</p>") +
          (tower.mobsLinked?.length
            ? `<p><strong>Affected Pokémon:</strong> ${tower.mobsLinked.join(", ")}</p>`
            : ""),
      });

      img.addEventListener("click", () => {
        if (!isTowerClickable(tower) || tower.destroyed) return;
        tower.destroyed = true;
        img.src = tower.imgBroken;
        img.classList.add("destroyed");
        img.style.pointerEvents = "none";
        addTowerKill(tower.name || tower.id, tower.img, state.currentTime);
        updateDisplay();
      });

      if (tower.destroyed) img.classList.add("destroyed");
      else if (!clickable) img.classList.add("disabled");
      img.style.pointerEvents = tower.destroyed || !clickable ? "none" : "auto";

      towersContainer.appendChild(img);
      tower.element = img;
    } else {
      tower.element.src = tower.destroyed ? tower.imgBroken : tower.img;
      tower.element.classList.remove("destroyed", "disabled");
      if (tower.destroyed) tower.element.classList.add("destroyed");
      else if (!clickable) tower.element.classList.add("disabled");
      tower.element.style.pointerEvents = tower.destroyed || !clickable ? "none" : "auto";
    }
  });
}