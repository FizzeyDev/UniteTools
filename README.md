<div align="center">

<img src="https://unite-tools.com/assets/favicon.svg" alt="Unite Tools Logo" width="80" />

# 🎮 Unite Tools

**The all-in-one companion for Pokémon Unite players - from casual to competitive.**

[![Website](https://img.shields.io/badge/🌐%20Website-unite--tools.com-blue?style=for-the-badge)](https://unite-tools.com)
[![License](https://img.shields.io/github/license/FizzeyDev/UniteTools?style=for-the-badge)](LICENSE)
[![Stars](https://img.shields.io/github/stars/FizzeyDev/UniteTools?style=for-the-badge)](https://github.com/FizzeyDev/UniteTools/stargazers)
[![Languages](https://img.shields.io/badge/langs-🇫🇷%20FR%20%7C%20🇬🇧%20EN-lightgrey?style=for-the-badge)](#)

</div>

---

## ✨ Features

| Tool | Status | Description |
|------|--------|-------------|
| 🗂️ **Draft Simulator** | ✅ Live | Full ban/pick simulator with multiple competitive modes |
| 📊 **Tier List Creator** | ✅ Live | Build and share your own Pokémon tier lists |
| ⏱️ **Map Timer** | ✅ Live | Track key in-game spawn timings |
| 🗺️ **Dynamic Map** | 🔜 Soon | Interactive map with live event tracking |
| ⚔️ **Damage Calculator** | 🚧 WIP | Estimate damage output for any matchup |
| 🎯 **Pokédle / Unite-dle** | ✅ Live | Daily guessing games for Unite fans |
| 🎨 **Skindle** | ✅ Live | Guess the Pokémon skin in daily challenges |
| 📋 **Patch Tracker** | ✅ Live | Follow and browse all Pokémon Unite patch notes |

---

## 🏆 Draft Simulator - Highlight

The draft simulator is the centerpiece of Unite Tools. It supports:

- **4 game modes** - Swap Ban, Tournament (2 or 3 bans), Reban
- **🌐 Online Multiplayer** - create or join a room with a 6-character code
- **👁️ Spectator mode** - watch a draft live without participating
- **⏱️ Configurable timer** - set per-pick countdowns
- **⚡ Fearless mode** - no repeat picks per team across a series
- **🌟 All-Star mode** - no repeat picks globally across a series
- **🗺️ Map selection** - Groudon, Kyogre, Rayquaza or random
- **↩️ Undo** - revert the last pick/ban at any time
- **🔍 Gallery filters** - sort and search by role, name, or Pokédex number

---

## 🛠️ Tech Stack

Built intentionally lean - no framework, no build step, just the web platform:

- **HTML5 / CSS3** - semantic markup, custom properties, responsive layout
- **Vanilla JavaScript (ES Modules)** - modular scripts under `scripts/`
- **GitHub Pages** - free hosting with custom domain (`unite-tools.com`)
- **i18n** - `data-lang` attribute system with `lang/` JSON files (🇫🇷 FR, 🇬🇧 EN)

---

## 📁 Project Structure

```
UniteTools/
├── assets/          # Images, icons, map visuals, Pokémon sprites
├── components/      # Reusable HTML components (navbar, etc.)
├── css/             # Per-page stylesheets
├── data/            # Pokémon data, move stats, game constants
├── lang/            # i18n translation files (fr.json, en.json)
├── scripts/         # JavaScript modules (draft, tierlist, timer…)
├── draft.html       # Draft Simulator
├── tierlist.html    # Tier List Creator
├── map_timer.html   # Map Timer
├── damage-calc.html # Damage Calculator (WIP)
├── pokedle.html     # Pokédle daily game
├── skindle.html     # Skindle daily game
└── index.html       # Homepage
```

---

## 🚀 Getting Started

No installation needed. Just open the site:

👉 **[unite-tools.com](https://unite-tools.com)**

Or run locally:

```bash
git clone https://github.com/FizzeyDev/UniteTools.git
cd UniteTools
# Open index.html in your browser, or use a local server:
npx serve .
```

> A local server is recommended for ES module support (`type="module"` scripts).

---

## 🗺️ Roadmap

- [ ] Dynamic interactive map
- [ ] Damage Calculator (complete)

---

## 🤝 Contributing

Contributions, bug reports and feature suggestions are welcome!

1. Fork the repo
2. Create your branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push and open a Pull Request

For bugs or ideas, open an [Issue](https://github.com/FizzeyDev/UniteTools/issues).

---

## 📬 Contact

Made with ❤️ by **Fizzey**, Pokémon Unite player & developer.

- 💬 Discord: `fizzeys.`
- 🐦 Twitter/X: [@FizzeyS](https://twitter.com/FizzeyS)

---

## ⚖️ Disclaimer

This is a fan-made, non-commercial project created for the community.

- Pokémon Unite is developed by **TiMi Studio Group** and published by **The Pokémon Company**, **Tencent Games**, and **Nintendo**.
- Pokémon and all related names, images, and assets are trademarks of **Nintendo**, **Creatures Inc.**, and **Game Freak Inc.**
- This project is **not affiliated with, endorsed, or sponsored** by Nintendo, The Pokémon Company, Tencent, or any of their partners.

All rights to Pokémon and Pokémon Unite belong to their respective owners.

---

<div align="center">

⭐ If you find this useful, consider leaving a star - it helps a lot!

</div>