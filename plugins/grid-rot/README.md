# GRID ROT

A separate browser study of moving spatial damage on the current source image.
Open http://localhost:8080/grid-rot/ after running the collection start.bat.
Requires WebGL 2. Media stays in the browser. No OFX build yet.

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
There is no frame history, feedback or delayed output. Amount 0 and View input
show the current source without the guide. Local frame holds may be explored later.

Presets use their own grid-rot-preset version 1 format and the collection's
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
