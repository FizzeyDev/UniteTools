import { state } from "./state.js";
import { loadSpawns } from "./timer.js";
import "./tracker.js"; // initialize tracker module (attaches window.trackerClearAll)
import "./guide.js";   // Spawn Guide (tables + explanations under the map)
import "./nextSpawns.js"; // "Next spawns" banner above the map

state.currentMap = "groudon";
document.getElementById("map-img").src = "assets/maps/map_groudon.webp";
loadSpawns("groudon");