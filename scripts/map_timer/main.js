import { state } from "./state.js";
import { loadSpawns } from "./timer.js";
import "./tracker.js"; // initialize tracker module (attaches window.trackerClearAll)

state.currentMap = "groudon";
document.getElementById("map-img").src = "assets/maps/map_groudon.webp";
loadSpawns("groudon");