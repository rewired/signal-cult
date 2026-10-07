# GRID ROT

A spatial and temporal cell-damage effect with a WebGL 2 look-development client
and a Windows x64 OpenFX implementation for DaVinci Resolve. Open
http://localhost:8080/grid-rot/ after running the collection start.bat. Browser
media stays local. The native development bundle has CPU and CUDA 12.8 paths;
live Resolve host validation and Companion transport remain release work.

## Controls

The source aspect selects a small base grid: 16:9, 9:16, 4:3 and 1:1 are exact.
Unusual ratios use the closest base with at most 24 cells on either axis, marked ≈.
Grid multiplier scales both axes by an integer from 1 to 8. It does not change
preview resolution (up to 1920 × 1080, preserving aspect).

Area width and height specify independent cell counts, capped at the current
grid size. The rectangular footprint wraps across edges. Its position travels
row by row with Step →/←, jumps with deterministic RND, or oscillates with LFO.
Motion speed is positions per second; an LFO cycle covers one grid's cell count.
Pause and Step motion inspect the effect on a frozen source. Reset motion
returns to the route start. The small grid shows the actual affected area;
Show grid adds an optional preview guide.

Displacement, color separation and tone damage affect only that area.
Optional cell memory, routing operators, infection, deformed topologies and
content targeting extend that area while remaining deterministic by timeline time.
Amount 0 and View input show the current source without the guide.

Presets use the grid-rot-preset version 2 format and the collection's
previous/next, JSON import/export workflow. BUCKET ROT and SIGNAL ROT are separate.

Original code uses the collection [license](../../LICENSE).

## Random drops

Random Drops is the initial look. Choose Random drops under Movement for up to
16 independent patches. Drop count sets the number of independent lanes; brief
gaps mean fewer can be visible at once. Area width/height are maximum sizes.
Drop variation randomizes size, strength, timing and gaps; zero gives equal-sized,
full-strength drops without gaps. Drop lifetime controls their typical duration
in seconds, independently of Motion speed (disabled in this mode). Random seed
selects a reproducible arrangement. Pause, Step motion (1/8 second per click)
and Reset motion work without advancing the source frame. Overlapping drops
use the strongest local drop rather than stacking damage. The inspector shows
all visible patches. Older version 1 presets load with default drop settings.

## Fracture modifier

Fracture depth subdivides affected cells locally: 0 disables it, 1 allows 2×2,
2 allows 4×4, and 3 allows 8×8 subcells. Fracture spread is the probability
of each further split. At 1 every affected cell reaches the selected depth;
at 0 all remain coarse. Intermediate values mix resolutions. Each subcell
has its own damage; displacement and color separation scale with its smaller
size. The source aspect and footprint in base cells stay the same.

The map and Show grid display local subdivisions (the small map omits lines
closer than one pixel). Fractures follow the active drop or route and stay
stable while paused. Try the Shattered Drops preset. Older presets load with
fracture disabled.

## Clusters

Cluster strength chooses what share of Random drops gathers around shared
centers; zero preserves free scattering. Cluster centers sets 1–6 independent
centers, renewed every four typical drop lifetimes. Cluster radius controls
the distance of drop origins from their center in base cells. Drop footprints
can extend beyond that radius and wrap at image edges. Each drop samples its
center at birth and stays there for its lifetime, so old and new clusters
can briefly coexist. Lifetimes, sizes, strengths and fractures remain independent.

Try Cluster Bloom for 14 drops around two centers with mixed fracture depths.
Cluster settings use the existing Random seed, work with pause and step, and
round-trip in presets. Older presets load with clustering disabled.

## Preset palette

| Preset | Character |
| --- | --- |
| Pin Pricks | Small, distinct punctures with sharp color edges |
| Digital Dust | Fast, fine fragments |
| Packet Loss | Coarse burst damage |
| Swarm | One tight, restless cluster |
| Chromatic Islands | Three slower RGB clusters |
| Glass Rain | Tall, narrow shards |
| Scan Rip | A backward-moving horizontal tear |
| Slow Collapse | Large, persistent areas with heavy damage |
| Cluster Bloom | Two loose islands with mixed fractures |
| Shattered Drops | Scattered patches with mixed cell sizes |
| Random Drops | Independent defects of varied size and duration |
| Grid Crawl | A single steady moving patch |
| Scatter | Small patches jumping across the grid |
| Wide Wave | A broad oscillating area |

## Extended renderer

GRID ROT v2 adds five deterministic systems that can be combined:

- Cell Memory keeps at most 32 RGBA8 preview frames and routes cells through Hold,
  Delay, Stutter, Reverse and Time Smear. H.264 MP4 files are probed locally with
  MP4Box.js and WebCodecs; unsupported files remain available in spatial-only mode.
- The operator matrix assigns one weighted routing operator to every fine cell.
  Zero total weight preserves the original GRID ROT renderer.
- Infection expands from active regions using timeline-derived spread, decay,
  direction and mutation. It does not depend on playback order.
- Rect, diagonal-shard and Voronoi topologies share stable logical cell IDs.
- Uniform, bright, dark, edge and motion targeting bias local damage from the
  current source and the previous cached frame.

The preview remains capped at 1920 × 1080. A full 32-frame 1080p RGBA8 history is
about 253 MiB of GPU storage. All media, history textures and decoder workers are
released when media changes or the page closes.

## Preset format and native implementation

New exports use `grid-rot-preset` version 2 with `temporal`, `infection`,
`topology`, `targeting` and `operators` sections. Version 1 imports receive
neutral defaults and retain their original spatial render.

Simulation hashes and flat numeric controls avoid browser-only state. The native
CPU/CUDA renderer mirrors those hashes. Its OpenFX adapter declares temporal clip
access, requests up to 31 earlier source frames and never preserves render-order
state. Play, seek, reverse navigation and export therefore resolve the same source
taps for the same timeline time and preset.

Build from the repository root with:

```powershell
./scripts/build-native.ps1 -Plugin grid-rot
./scripts/build-native.ps1 -Plugin grid-rot -CpuOnly
```

### Control-surface split

The web client prototypes the intended native workflow. The split is explicit and
is exported as `surfaceContract` from `js/params.js`:

| Surface | Controls |
| --- | --- |
| Direct OFX | Preset, movement route, bypass, amount, grid multiplier, area width/height, motion speed, drop count/lifetime, displacement, color separation and tone damage |
| Companion only | Pattern variation and seed, clustering, fracture, content targeting, infection, topology, temporal memory and the operator matrix |
| Web only | Media loading, transport, decoder diagnostics and the grid-map preview |

Companion-only values remain part of every V2 preset and the native render state.
The OFX can therefore render advanced presets without exposing their full editing
surface. Opening the Companion is only required to edit those advanced values.
### Extended presets

| Preset | Character |
| --- | --- |
| Frozen Infection | Held cells spread through a decaying infection |
| Time Mosaic | Fractured cells sample different moments |
| Memory Collapse | Large temporal blocks collapse backward |
| Cellular Burn | Mutating noise and blackout wave |
| Operator Storm | Broad weighted spatial operator bank |
| Shard Current | Warped diagonal cells |
| Voronoi Decay | Irregular delayed infection |
| Edge Parasite | Damage biased toward contrast edges |
| Motion Eater | Delay and blackout biased toward movement |
| ZASH // IMPACT | Maximum short-form shard, infection and routing impact |
| ZASH // CHROMA KNIFE | Edge-biased mirrored chromatic cuts |
| ZASH // TIME SLAP | Aggressive stutter, reverse and delay hit |
| ZASH // VOID PUNCH | Motion-sensitive Voronoi blackout bursts |
| ZASH // CASCADE | Vertical warped temporal avalanche |
