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

  // Place sprites after the map image is ready
  function doPlace() {
    if (!App.clientToCanvas || !App.resizeCanvas) {
      // Modules not ready yet – retry shortly
      setTimeout(doPlace, 120);
      return;
    }
    App.resizeCanvas();
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

// ─── _placeSpriteOnMap replaced by App.placeSprite (see sprites.js) ───────────

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
  const colX   = isLeft ? W * 0.18 : W * 0.82;
  const startY = H * 0.20;
  const stepY  = H * 0.10;

  mons.forEach((mon, i) => {
    const item = {
      id:   mon.file ? mon.file.replace(/\.[^.]+$/, "") : mon.name,
      name: mon.name,
      img:  mon.src,
    };
    // App.placeSprite est exposé par sprites.js → move/select/erase fonctionnent
    App.placeSprite(item, colX, startY + i * stepY, team, 52);
  });
}