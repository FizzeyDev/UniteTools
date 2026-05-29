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

## 🔧 Tools

| Tool | Description |
|------|-------------|
| 📋 **Draft Simulator** | Bans, picks, timer, Fearless mode & multiplayer |
| ⏱️ **Map Timer** | Real-time objective timers |
| 💥 **Damage Calculator** | Precise calculations with items, levels & buffs |
| ⚡ **XP Calculator** | Simulate XP gain & find optimal farming paths |
| 📊 **Tier List** | Create and share your custom tier lists |
| 🗺️ **Interactive Map** | Explore objectives, zones & draft integration |
| 📝 **Patch Tracker** | All patch notes with stats & impact analysis |
| 🖥️ **Stream Overlay Tool** | Custom overlays & widgets for your stream |

---

## 🎮 Unite Games - Daily Challenges

A hub of daily mini-games built around the Pokémon Unite universe. New puzzles every day, solo or multiplayer.

| Game | Description |
|------|-------------|
| 🎮 **Pokédle UNITE** | Guess the daily Pokémon using role, range & difficulty clues |
| 🔍 **Skindle** | Identify a zoomed-in skin - zoom out with every wrong guess |
| 🔤 **PokéSearch** | Find 10 hidden Pokémon in the daily word grid |
| 👥 **PokéWho** | Real-time Guess Who? against a friend - pick a secret Pokémon |

---

## 🏆 Draft Simulator - Highlight

The draft simulator is the centerpiece of Unite Tools. It supports:

- **Multiple game modes** - Swap Ban, Tournament (2 or 3 bans), Reban
- **🌐 Online Multiplayer** - create or join a room with a 6-character code
- **👁️ Spectator mode** - watch a draft live without participating
- **⏱️ Configurable timer** - set per-pick countdowns
- **⚡ Fearless mode** - no repeat picks per team across a series
- **🌟 All-Star mode** - no repeat picks globally across a series
- **🗺️ Map selection** - Groudon, Kyogre, Rayquaza or random
- **↩️ Undo** - revert the last pick/ban at any time
- **🔍 Gallery filters** - sort and search by role, name, or Pokédex number

---

## 🗺️ Roadmap

- 🚧 **Damage Calculator** - All moves & passives effects support
- 🚧 **Interactive Map × Draft & Damage Calculator** - Live integration between the map and draft simulator; simulate 1v1 directly from the map
- 🚧 **Patch Tracker** - Complete patch history with real data & stat changes

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
├── damage-calc.html # Damage Calculator
├── xp-calc.html     # XP Calculator
├── map.html         # Interactive Map
├── patch.html       # Patch Tracker
├── stream.html      # Stream Overlay Tool
├── pokedle.html     # Pokédle daily game
├── skindle.html     # Skindle daily game
├── wordsearch.html  # PokéSearch daily game
├── guesswho.html    # PokéWho multiplayer game
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

## 👤 About the Creator

Made with ❤️ by **Fizzey** - competitive Pokémon Unite player, web developer, and active member of the French esport scene.

> *"My goal is to create a tool for the competitive community that I and my team will also use."*

Beyond building this site, Fizzey plays for **[Volticons Unite](https://x.com/VoltIconsUnite)**, a European team qualified in the official Pokémon Unite league.

The competitive Pokémon Unite scene was sorely lacking dedicated tools - no updated draft simulator, no damage calculator, nothing to practice map control. Unite Tools was born from that frustration: a solo project built with passion to raise the level of the entire community.

---

## 🤝 Contributing

Contributions, bug reports, and feature suggestions are welcome!

1. Fork the repo
2. Create your branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push and open a Pull Request

For bugs or ideas, open an [Issue](https://github.com/FizzeyDev/UniteTools/issues).

---

## 💬 Community

Join the Discord to follow the project's progress, share feedback, report bugs, suggest features, and connect with other players. Updates and new tools are announced there first.

👉 **[Join the Discord](https://discord.gg/PerJa3Su)**

---

## 📬 Contact

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