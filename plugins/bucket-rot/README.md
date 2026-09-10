# BUCKET ROT — browser study

A 64-stage video delay with an 8 × 8 modulation matrix. This is an experimental
browser effect, not an OFX plugin. Start the collection and open
[localhost:8080/bucket-rot/](http://localhost:8080/bucket-rot/).

## Read the matrix

The matrix is one linear chain displayed in eight rows: 01–08, 09–16, …, 57–64.
It is not a two-dimensional image tile effect. Each cell holds an entire image.
Click a cell to select its output tap. The pink border marks the selected stage;
a white inset border shows the most recent trigger position. Filled cells contain
stored images; an empty output tap temporarily shows the live source.

**Final stage only** solos the end of the signal chain: stage 64 for rightward
travel, stage 01 for leftward travel. It displays only that delayed image, without
live-input blending or recirculating feedback. Matrix selection, Amount and
Feedback are disabled while soloed; their values are retained for switching back.
Modulation damage still applies to the final image, including chroma separation.

Enabling solo clears memory to remove previously baked-in feedback echoes. The
preview stays black and is labelled as filling until the final stage receives an
image (64 transfers for an empty chain). View input remains an explicit bypass.
The switch is saved in JSON presets; older presets default to an unlocked output.

- **Orange / Carry modulation with the image:** a disturbance is attached to an
  image packet. It follows that packet through subsequent stages in the signal
  direction, losing strength and expiring after its configured travel length.
- **Mint / Send a wave through the stages:** an independent disturbance travels
  through the stage positions. It affects whichever image occupies each position
  at that clock tick. It does not remain attached to that image when it leaves.
- Enable either route or both. Each cell has separate orange and mint triangles;
  hover for the strength of each route. Disabling a route clears its active events.

## Movement and clock

**Signal travel** moves the image packets from 01 to 64 or from 64 to 01.
**Wave travel** sets the independent wave direction. Directions can change live.
Events stop at the chain ends. Only the trigger position wraps.

**Trigger motion** selects Step right, Step left, seeded RND or a sine LFO. New
triggers occur every configured number of clock ticks. The LFO position is sampled
at those triggers. **Travel length** applies to newly triggered events; **Decay per
step** attenuates existing events at each transfer. Signal-bound patterns follow
packet identity; the wave pattern evolves with the clock.

**Clock** sets transfers per second. Nominal delay is the number of transfers
between the input and selected tap divided by the clock rate, plus sample-and-hold
latency of up to one tick. Changing the clock stretches or compresses the buffered
sequence. **Feedback** mixes the selected output back into newly arriving images;
this can also bake the visible damage into recirculating image content.

Pause playback and use **Step clock** to inspect individual transfers with the
current source frame held still. **Clear memory** clears the chain, modulation,
random seed and clock phase. Preset/mode changes, seeks and loops also reset it.
Tap selection and travel-direction changes preserve the existing chain.

## Resolution and spatial influence

**Memory resolution** uses integer factors: at a 960 × 540 preview, ×1 stores
320 × 180 images, ×2 stores 640 × 360, and ×3 stores full 960 × 540 images.
×2 is the default. Changing this control reallocates and clears the chain.
Portrait and smaller sources keep their aspect ratio and scale proportionally.

**Matrix area** controls the spatial extent of each disturbance. ×1 affects one
cell of an 8 × 8 image grid; ×2 affects a 2 × 2 area; ×8 affects the whole image.
Areas are centered on their cell and shifted inward at the image boundaries.
A carrier keeps the spatial origin of its trigger as it travels with the image.
A stage wave affects the area belonging to its current stage. This changes the
modulation footprint; each delay stage still stores a complete image.

## Prototype scope

- Local media processing, WebGL 2, no installation or frontend build.
- Video, still images and a moving test signal; video is muted.
- Display up to 960 × 540. The 64-image store uses roughly 14, 56 or 127 MiB
  at 16:9 for memory scales ×1, ×2 or ×3, excluding display/decode buffers.
- 8-bit SDR processing with displacement, chroma separation and tonal loss. This
  is a visual interpretation of a bucket-brigade delay, not circuit simulation.
- Clock advancement follows source-time updates, capped after interruptions.
  High clock rates may capture repeated images from lower-frame-rate video.
- Live sequential state, not frame-independent rendering. No OFX or video export.
- Standard collection preset toolbar, validated JSON exchange, and source controls.

Source tests cover image movement, independent modulation directions, expiration,
reset, trigger modes and preset validation. Run `../../scripts/test.ps1`.

## License

[BSD-3-Clause with Commons Clause 1.0](../../LICENSE), as described in the
[collection README](../../README.md). Third-party licenses remain applicable.
