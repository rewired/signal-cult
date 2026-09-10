# SIGNAL ROT — browser preview

An experimental motion-driven feedback effect in the SIGNAL CULT collection.
This is a local browser prototype for judging the look. There is no OFX plugin,
Companion, installer or decision to build a native version yet.

## Try it

Run the collection's `start.bat`, then open
[localhost:8080/signal-rot/](http://localhost:8080/signal-rot/).
The plugin-local `start.bat` opens the same collection server. No npm install,
frontend build, cloud account or media upload is needed. Requires WebGL 2.

Start with the moving test signal, or load/drop a video. Images are accepted too;
stationary images provide no motion, but can be used to inspect Contour Ghost.

- **Motion Melt:** motion pulls older colors into soft trails.
- **Block Rot:** tile-based movement fractures and drags the stored image.
- **Contour Ghost:** darkened source with bright, decaying contour traces.

Six controls shape the result: Amount, Memory (seconds), Flow strength,
Block size (preview pixels), Motion sensitivity and Edge protection.
Block size is active for Block Rot; Edge protection is inactive for Contour Ghost.
Ctrl-drag snaps sliders to larger steps; double-click resets a slider.

**Clear memory** removes accumulated trails. **View input** toggles the original
without resetting the effect. Pause freezes feedback; Amount and input/output
view still work. Other parameter changes affect subsequent frames. The video
position slider, clip changes, loop boundaries, mode changes and preset loading
reset memory to avoid carrying unrelated frames into the next image.

The preset toolbar follows the collection: previous/next, Current / custom,
validated JSON import (64 KB limit), named JSON export and status feedback.
Preset loading resets history; malformed presets leave the current settings intact.

## Prototype limits

- Preview resolution is capped at 960 × 540, preserving source aspect ratio.
- Two-scale GPU block matching estimates backward motion. This is an approximate
  optical-flow technique; it struggles with occlusions, flat areas, cuts and large
  displacements. It is not codec corruption or a neural motion model.
- Memory is an 8-bit SDR feedback texture, not an HDR/color-managed pipeline.
- Video is muted and loops. Browsers decode only formats they support.
- The moving demo targets 30 updates/second. Video advances feedback on decoded
  frames when the browser exposes video-frame callbacks. Paused frames do not
  repeatedly feed back. Frame drops and playback order still affect the look.
- Still images advance at 30 updates/second while playing, without motion vectors.
- Feedback is live and sequential. Seeking starts fresh; it does not reconstruct
  the history of earlier playback. This is deliberately not a timeline-safe OFX
  implementation. Video export and persistent sessions are not implemented.

The UI imports the collection master stylesheet and slider helper from BROKEN FM.
The renderer itself is independent. Run `../../scripts/test.ps1` for all source
regression tests. Browser checks should also cover actual GPU rendering and media.

## License

[BSD-3-Clause with Commons Clause 1.0](../../LICENSE), as described in the
[collection README](../../README.md). Third-party licenses remain applicable.
