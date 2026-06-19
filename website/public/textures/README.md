# World PBR textures

Scanned PBR material sets (1K JPG) used by the open 3D world (`/world`).

| Folder    | Source set (ambientCG) | Used for          |
| --------- | ---------------------- | ----------------- |
| `ground/` | Grass004               | planet surface    |
| `rock/`   | Rock023                | scattered rocks   |
| `wall/`   | PaintedPlaster003      | building walls    |
| `roof/`   | RoofingTiles003        | building roofs    |

Each folder holds `albedo.jpg`, `normal.jpg` (OpenGL/NormalGL), `roughness.jpg`.

**Licence:** all sets are from [ambientCG](https://ambientcg.com) and released
under **CC0 1.0 (public domain)** — free for any use, no attribution required.

These are a license-clean stand-in with the same channel layout as a Substance
3D export (base colour / normal / roughness), so Substance-authored map sets can
replace them 1:1 by dropping the matching files into the same folders.
