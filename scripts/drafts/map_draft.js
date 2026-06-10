// ─── Draft page: collect & open ───────────────────────────────────────────────

/**
 * @param {string}        mapName     – "groudon" | "kyogre" | "rayquaza"
 * @param {HTMLElement[]} teamASlots  – result of getAllPickSlots("teamA")
 * @param {HTMLElement[]} teamBSlots  – result of getAllPickSlots("teamB")
 * @param {string}        [label]     – optional title shown in the map tab
 */
export function openMapFromDraft(mapName, teamASlots, teamBSlots, label = "") {
  const picks = {
    map: mapName || "groudon",
    label: label || "Draft",
    teamA: _extractSlots(teamASlots),
    teamB: _extractSlots(teamBSlots),
  };

  // Store under a timestamped key so multiple tabs don't collide
  const key = `draft_map_${Date.now()}`;
  localStorage.setItem(key, JSON.stringify(picks));

  // Pass the key via the URL hash so map.html can find it
  const url = `map.html#draft=${key}`;
  window.open(url, "_blank");
}

function _extractSlots(slots) {
  return slots
    .map(slot => {
      const img = slot.querySelector("img");
      if (!img) return null;
      return {
        file: img.dataset.file || img.src.split("/").pop(),
        src:  img.src,
        name: img.alt || "",
      };
    })
    .filter(Boolean);
}

// ─── Map page: hydrate sprites from localStorage ───────────────────────────────

/**
 * Called once on map.html after all map scripts have loaded.
 * Reads the key from location.hash, fetches the draft data from
 * localStorage, then places sprites on the canvas.
 */
export function hydrateDraftSprites() {
  const hash = window.location.hash; // e.g. "#draft=draft_map_1234567890"
  if (!hash.startsWith("#draft=")) return;

  const key  = hash.slice("#draft=".length);
  const raw  = localStorage.getItem(key);
  if (!raw) return;

  let picks;
  try { picks = JSON.parse(raw); } catch { return; }

  // Clean up – one-shot use
  localStorage.removeItem(key);

  // Switch to the correct map first, then place sprites once the image loads
  const mapImg = document.getElementById("map-img");
  if (!mapImg) return;

  // Activate the right map pill
  document.querySelectorAll(".map-pill").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.map === picks.map);
  });

  const MAP_SRCS = {
    groudon:  "assets/maps/map_groudon.webp",
    kyogre:   "assets/maps/map_kyogre.webp",
    rayquaza: "assets/maps/map_rayquaza.avif",
  };
  mapImg.src = MAP_SRCS[picks.map] || MAP_SRCS.groudon;

  // Place sprites after the map image is ready AND the canvas is sized
  function doPlace() {
    if (!App.clientToCanvas || !App.resizeCanvas) {
      // Modules not ready yet – retry shortly
      setTimeout(doPlace, 120);
      return;
    }

    App.resizeCanvas();

    // Wait until the canvas actually has real dimensions before placing sprites
    const canvas = document.getElementById("draw-canvas");
    if (!canvas || canvas.width <= 300) {
      setTimeout(doPlace, 100);
      return;
    }

    _placeTeam(picks.teamA, "purple");
    _placeTeam(picks.teamB, "orange");

    // Update page title
    document.title = picks.label
      ? `Map – ${picks.label}`
      : "Unite Tools – Interactive Map";
  }

  if (mapImg.complete && mapImg.naturalWidth > 0) {
    setTimeout(doPlace, 200); // give viewport.js time to centreMap
  } else {
    mapImg.addEventListener("load", () => setTimeout(doPlace, 200), { once: true });
  }
}

// Spread team sprites in two columns on their respective half of the map
function _placeTeam(mons, team) {
  if (!mons || !mons.length) return;

  const canvas = document.getElementById("draw-canvas");
  if (!canvas || !canvas.width) return;

  const W = canvas.width;
  const H = canvas.height;

  // Purple (teamA) → left side, Orange (teamB) → right side
  const isLeft = team === "purple";

  // Layout: a neat column near the edge
  const colX   = isLeft ? W * 0.07 : W * 0.93;
  const startY = H * 0.12;
  const stepY  = H * 0.13;

  mons.forEach((mon, i) => {
    const item = {
      id:   mon.file ? mon.file.replace(/\.[^.]+$/, "") : mon.name,
      name: mon.name,
      img:  mon.src,
    };

    // Use App.startDragFromPanel internals by calling placeSprite directly.
    // placeSprite is not exported, so we recreate the DOM element ourselves
    // using the same pattern as sprites.js.
    _placeSpriteOnMap(item, colX, startY + i * stepY, team);
  });
}

function _placeSpriteOnMap(item, canvasX, canvasY, team) {
  // Mirror of the placeSprite() function in sprites.js
  const spritesLayer = document.getElementById("sprites-layer");
  const canvas       = document.getElementById("draw-canvas");
  if (!spritesLayer || !canvas) return;

  const size = 52;

  const spriteEl = document.createElement("div");
  spriteEl.className = `placed-sprite team-${team}`;
  spriteEl.style.left = (canvasX / canvas.width  * 100) + "%";
  spriteEl.style.top  = (canvasY / canvas.height * 100) + "%";

  const ring = document.createElement("div");
  ring.className = "sprite-team-ring";

  const img = document.createElement("img");
  img.src       = item.img;
  img.alt       = item.name;
  img.draggable = false;
  img.style.width  = size + "px";
  img.style.height = size + "px";
  img.onerror = () => {
    if (App.generatePlaceholderSvg) img.src = App.generatePlaceholderSvg(item.name);
  };

  const badge = document.createElement("span");
  badge.className   = "sprite-name-badge";
  badge.textContent = item.name;
  badge.style.display = App.showNames ? "block" : "none";

  const deleteBtn = document.createElement("div");
  deleteBtn.className   = "sprite-delete";
  deleteBtn.textContent = "×";

  spriteEl.appendChild(ring);
  spriteEl.appendChild(img);
  spriteEl.appendChild(badge);
  spriteEl.appendChild(deleteBtn);
  spritesLayer.appendChild(spriteEl);

  const entry = {
    el: spriteEl, id: item.id, name: item.name,
    imgSrc: item.img, team, size, img, badge, canvasX, canvasY,
  };
  App.placedSprites.push(entry);

  deleteBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    spriteEl.remove();
    App.placedSprites = App.placedSprites.filter(e => e !== entry);
    if (App.selectedSprite === entry) App.selectSprite && App.selectSprite(null);
  });

  spriteEl.addEventListener("mousedown", (ev) => {
    if (ev.button !== 0) return;
    ev.stopPropagation();
    ev.preventDefault();
    if (App.currentTool === "eraser") {
      spriteEl.remove();
      App.placedSprites = App.placedSprites.filter(e => e !== entry);
      if (App.selectedSprite === entry) App.selectSprite && App.selectSprite(null);
      return;
    }
    App.selectSprite && App.selectSprite(entry);
    if (App.currentTool === "cursor") {
      // trigger move — reuse App's internal move logic by dispatching a mousedown
      // the sprites.js move handler listens on document, so we just need to let it bubble
    }
  });
}