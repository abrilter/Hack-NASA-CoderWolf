# Rescue at the Lunar South Pole

**A pixel art mission trainer for junior astronauts.**
NASA Space Apps Challenge 2026 · Challenge: *Build a Junior Astronaut Mission Trainer* · Team **CoderWolf** (Puebla, Mexico)

▶ **Play online:** https://abrilter.github.io/Hack-NASA-CoderWolf/

If the game does not open, try switching to a different network (such as mobile data) to solve the problem, because the school network sometimes blocks it.

📦 **Repository:** https://github.com/abrilter/Hack-NASA-CoderWolf

> Project developed by a participating team. It is not an official NASA product and is not endorsed by NASA.

---

## Table of contents

1. [Overview](#overview)
2. [The challenge and our response](#the-challenge-and-our-response)
3. [Story and missions](#story-and-missions)
4. [NASA data](#nasa-data)
5. [How to run it](#how-to-run-it)
6. [Developer tools](#developer-tools)
7. [Technical architecture](#technical-architecture)
8. [Project structure](#project-structure)
9. [Adding or changing content](#adding-or-changing-content)
10. [Safety, inclusion and accessibility](#safety-inclusion-and-accessibility)
11. [AI usage declaration](#ai-usage-declaration)
12. [Credits and references](#credits-and-references)
13. [Team](#team)

> **Note on file names:** the source code was written in Spanish, so some folder, file and parameter names are Spanish (for example `escenas` = scenes, `datos` = data). They are shown exactly as they appear in the code so the paths work; their meaning is given in English next to them.

---

## Overview

*Rescue at the Lunar South Pole* is a browser game in pixel art for children aged about 7 to 12.

Dr. Itzel Ramos and her robot Chispa are trapped at the Moon's south pole just before a huge solar storm. The base radio is broken, Chispa is lost in a crater and Itzel is running out of oxygen. Every astronaut is busy on another mission, so Mission Control picks **the player** to lead the rescue.

On the way, the player makes real engineering decisions: which suit and spacecraft to use, what to pack in a 10 kg backpack, how to land under lunar gravity, which route to take and where to shelter from radiation.

**No choice is free.** Every advantage costs oxygen, mass, fuel, time or radiation exposure. A simulation model computes the consequences using NASA data. At the end, a mission journal explains each decision and lists every source, labeled **"Real data"** or **"Example data"**.

The game runs in any modern browser, needs no installation or account, and never asks for personal data: the player uses a code name.

## The challenge and our response

The challenge asks for an interactive game or app where young people manage a mission on the Moon or Mars. Space STEM content for kids often oversimplifies the engineering trade-offs that shape real missions. We turned each trade-off into a playable decision with visible consequences:

| Decision | Advantage | Cost |
|---|---|---|
| Armored or light suit | Better radiation protection | More mass: slower walking and more O₂ use |
| Large or small spacecraft | More fuel and extra O₂ | Less agility during landing |
| Solar alert in flight | Charge shield / speed up / save air | O₂, landing fuel or no extra protection |
| Backpack (10 kg limit) | Shield, radio, first-aid kit, flashlight, food | Each item adds mass; the O₂ tank is mandatory |
| Route: crater or ridge | Crater: shorter | Crater: dark and freezing; ridge: more exposure time |
| Boulder field | Drive around (safe) or cross on foot (short) | O₂, and you may have to leave the rover or drop items |
| Shelter from the storm | Rock overhang protects a lot | Detour and waiting; continuing saves time but raises the dose |
| Rescue: share air or leave your reserve | Help Itzel | Your O₂, time and extra radiation |

A balance test plays all the combinations automatically to make sure **no single strategy always wins** (see [Developer tools](#developer-tools)).

## Story and missions

The game is one continuous story split into short missions. The mission order is defined in [src/config.js](src/config.js).

| # | Mission | What the player does and learns |
|---|---|---|
| — | Title screen | Movie-style opening that shows the storm the game will use (live from DONKI or a real past storm). |
| 1 | Story | Animated story: the family sees the Space Station pass, Chispa detects the solar storm, the accident at the base, "rescuer wanted". |
| 1 | Letter | Choose a code name and a reason to go; Mission Control picks you. |
| 2 | Equipment | Explorable hangar: a scale shows the suit's mass and a radiation arch shows how much each suit blocks. Choose suit and spacecraft. |
| 3 | Journey | Solar alert on the way to the Moon: charge the shield, speed up or save air. This fixes the game's storm. |
| 4 | Landing | Landing minigame with real lunar gravity (1.62 m/s²). Only the thruster brakes, because there is almost no air; fuel is limited. |
| 5 | Control Center | Pack the backpack without going over 10 kg. Guided by STELLA, a holographic assistant. |
| 6 | Base exterior | Walk to the vehicle area and drive the rover following beacons. |
| 7 | Route | South pole map: the Sun stays on the horizon, shadows rotate and crater floors never see light. Choose crater or ridge. |
| 8 | Frozen crater | Only on the crater route: drive in the dark at more than 200 °C below zero, with a heater and dust to clean. |
| 9 | Tracks | Use a magnifying glass to compare two rover tracks and find Itzel's. Each clue costs oxygen. |
| 10 | Boulder field | Drive around it or cross on foot carrying your backpack. |
| 11 | Storm | The CME arrives. Choose shelter. Radiation = storm strength × hours × (1 − protection from shelter, suit and shield). |
| 12 | Rescue | Chispa guides you to Itzel. Share air, choose how to return and decide which messages to send to Earth. |
| — | Ending and journal | One of four endings (none punishes the player), a badge, the plant from the base, a book-style mission journal with "What if…?" notes, and the list of NASA sources. |

If oxygen reaches 0 or radiation reaches 100, the next mission change goes straight to the ending (evacuation), where Chispa explains what happened.

## NASA data

All data lives in [datos/datos.json](datos/datos.json) (the game's data file) and is shown on the final screen. **Integrity rule:** example data is never presented as real; every value carries its label on screen.

| NASA resource | How the game uses it | Status |
|---|---|---|
| [DONKI – CMEAnalysis](https://ccmc.gsfc.nasa.gov/tools/DONKI/) via [api.nasa.gov](https://api.nasa.gov) | Finds the fastest recent coronal mass ejection (CME). Its speed sets when the storm reaches the Moon. | Live / example |
| [OSDR RadLab](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) | Radiation dose rate shown during the storm. | Example |
| [OSDR – OSD-476](https://osdr.nasa.gov/) | Plants grown in Apollo lunar regolith (Paul, Elardo & Ferl, 2022): the plant at the base. | Real |
| OSDR (Space Station studies) | Itzel explains bone and muscle loss in microgravity without exercise. | Real |
| [LRO](https://science.nasa.gov/mission/lro/) and Diviner | Permanently shadowed craters with water ice; below −238 °C; Apollo 17 tracks still visible. | Real |
| [Moon Trek](https://trek.nasa.gov/moon/) | Landing zone: rim of Shackleton crater (89.67° S, 129.78° E). | Real |
| Moon Fact Sheet | Lunar gravity of 1.62 m/s² in the landing physics. | Real |

### How the solar storm works

The storm logic lives in [src/nasa/sol.js](src/nasa/sol.js) (`sol` = sun). The game **never waits for NASA**:

1. It starts instantly with a backup: the last good DONKI result saved in this browser or, if there is none, a famous real storm from the historical storms list in the data file.
2. In the background it queries DONKI ([src/nasa/donki.js](src/nasa/donki.js)) for the fastest CME of the last days.
3. If the answer arrives before the first mission that uses the storm, the game uses it. Otherwise it is saved for the next game. Once a mission uses the storm, it stays fixed for the rest of the game.

Storm arrival time = Sun–Moon distance ÷ CME speed.

## How to run it

### Online
Open **https://abrilter.github.io/Hack-NASA-CoderWolf/**. Nothing to install.

### Locally
The game reads JSON files, so it needs a local web server. Opening `index.html` with a double click will not work.

```bash
git clone https://github.com/abrilter/Hack-NASA-CoderWolf
cd Hack-NASA-CoderWolf
```

Then pick one:
- **VS Code:** install the *Live Server* extension, right-click `index.html` → *Open with Live Server*.
- **Python:** `python -m http.server 8000` and open http://localhost:8000.

There is no build step and no dependencies to install. Phaser is included in `lib/phaser.min.js`, with a CDN fallback.

To start offline (skip the DONKI query), add `?sinred=1` to the URL (`sinred` = "no network").

## Developer tools

| URL / file | What it does |
|---|---|
| `index.html?dev=1&sinred=1` | Shows a developer bar (top right): current mission, oxygen, ◀ previous, **Skip ▶** next, and a list to jump to any mission. Players never see it. |
| `index.html?escena=Ruta` | Opens one mission directly with a test state (`escena` = scene; `Ruta` = Route). |
| `…&traje=blindado&nave=grande&mochila=oxigeno,linterna&oxigeno=80` | Overrides the test state: `traje` = suit (`blindado` armored / `ligero` light), `nave` = spacecraft (`grande` large / `pequena` small), `mochila` = backpack items, `oxigeno` = oxygen. Also `escudo` (shield), `radiacion` (radiation), `energia` (energy), `ruta` (route). |
| [pruebas/balance.html](pruebas/balance.html) | Balance test: plays every combination of suit, spacecraft, backpack, shield and route with the real model and checks that no option always wins. |
| [pruebas/tormentas.html](pruebas/tormentas.html) | Storm viewer: shows the DONKI storms the game would use. |
| [pruebas/equipo.html](pruebas/equipo.html) | Equipment test: checks the suit and spacecraft numbers. |

If a mission name does not exist, the browser console prints the list of valid names.

## Technical architecture

- **Stack:** HTML5 + JavaScript (native ES modules) + [Phaser 3.80.1](https://phaser.io). No transpiler or bundler.
- **Resolution:** every mission draws on a 320×180 canvas. A small plugin in [src/main.js](src/main.js) scales each camera ×4 with no smoothing, so pixel art stays sharp at 1280×720.
- **Art made with code:** sprites are letter maps turned into textures ([src/pixelart.js](src/pixelart.js) and the other art files). If a PNG is missing from `assets/`, the game draws a placeholder of the same size.
- **Sound made with code:** all effects use the Web Audio API. No audio files.
- **Content separated from code:** all dialogue is in one text file and all NASA data and balance numbers are in one data file (see [Project structure](#project-structure)), so they can be translated or updated without programming.
- **Simulation model:** [src/modelo/simulacion.js](src/modelo/simulacion.js) computes oxygen, radiation, fuel and time from the player's choices and the data.
- **Shared state:** one shared state module holds the mission variables, and every mission changes resources through the same function, so all of them respect the same limits (oxygen 0–150, shield and energy 0–100).
- **Mission flow:** each mission asks the configuration for the next one instead of hard-coding it. A mission that is not in the order goes to the ending.

## Project structure

```
index.html              Entry point (loads Phaser and the game)
lib/phaser.min.js       Phaser 3.80.1 game engine
src/
  main.js               Creates the game, registers missions, pixel zoom plugin
  config.js             Resolution, colors, assets, suits/ships/backpack, mission order, test state
  estado.js             Shared game state and limits ("estado" = state)
  ui.js                 Reusable UI: text, titles, buttons, bars, "Real data" label
  pixelart.js           Letter-map sprites (astronaut, Chispa, ships…)
  arteExterior.js       Art for the base exterior and rover
  arteHuellas.js        Art for the tracks mission
  stella.js             STELLA, the holographic assistant
  sonidos.js            Web Audio sound effects ("sonidos" = sounds)
  pruebas.js            Developer bar ("pruebas" = tests)
  modelo/simulacion.js  Decision model ("modelo" = model)
  nasa/donki.js         DONKI API query
  nasa/sol.js           Chooses the game's solar storm
  escenas/              One file per mission ("escenas" = scenes)
datos/                  Data ("datos" = data)
  textos.json           All dialogue ("textos" = texts)
  datos.json            NASA data with sources and links, balance numbers
  misiones/             Per-mission data ("misiones" = missions)
assets/                 Optional images (backgrounds, sprites, UI) and sounds
pruebas/                Balance and data test pages
```

Other documents in the repository are internal team notes written in Spanish: the team guide, the design analysis and the final technical review.

## Adding or changing content

- **Change dialogue:** edit the text file (`datos/textos.json`). No code changes needed.
- **Change a balance number:** edit `src/config.js` or the model section of `datos/datos.json`, then reload the balance test page and check that everything is still green.
- **Add NASA data:** add an entry with its source, link and a real/example flag to `datos/datos.json` so it shows on the final screen.
- **Add a mission:** create the mission file in `src/escenas/`, register it in `src/main.js`, add it to the mission order in `src/config.js`, and let it ask the configuration for the next mission.
- **Replace placeholder art:** drop a PNG in `assets/` with the exact name and size listed in the asset list in `src/config.js`.

## Safety, inclusion and accessibility

- **Privacy by design:** no names or personal data; the player picks a code name from a closed list.
- **Readable for kids:** short texts and simple vocabulary; all text is in one file, ready to translate.
- **Input:** mouse, touch and keyboard.
- **Lightweight:** runs on school computers in any modern browser.

## AI usage declaration

Following the Space Apps rules on AI tools:

- **Claude Code** (Anthropic) was used as a development assistant: writing and reviewing mission code, generating pixel art letter maps, implementing animations, and drafting documentation.
- The story, mission design, simulation rules and testing were done by the team.
- No NASA data or scientific value was generated by AI. Every value comes from the sources listed in [NASA data](#nasa-data).

## Credits and references

- [Phaser 3](https://phaser.io): game engine.
- Web Audio API: procedural sound.
- Color palette inspired by public pixel art palettes (PICO-8 / Lospec).
- NASA resources: [DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/), [api.nasa.gov](https://api.nasa.gov), [OSDR](https://osdr.nasa.gov/), [OSDR RadLab](https://visualization.osdr.nasa.gov/radlab/gui/data-api/), [LRO](https://science.nasa.gov/mission/lro/), [Moon Trek](https://trek.nasa.gov/moon/).

## Team

**CoderWolf** · Local event: Puebla, Mexico

- Shadia Reyes García
- Angel Sanchez Cabrera
- Leslie Abril Gómez Mora
- Miguel Angel Ortega de la Cruz
- Jonathan Martin Rasgado Blas
