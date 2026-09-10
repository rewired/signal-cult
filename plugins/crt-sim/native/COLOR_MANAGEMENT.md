# OFX color management

Version 0.6.0 processes managed input in **linear Rec.709-primary RGB**, then converts the result back to the **same input color space and transfer function**. This working representation is floating point and retains negative channels and values above 1; it is not a Rec.709 gamut clamp or an SDR output transform.

## Resolve setup

Set **Color Processing** to **Color Managed**, then match **Input Color Space** and **Input Gamma** to the signal arriving at this OFX node. In a color-managed Resolve project, this is normally the timeline/working space, not the original media tag or the output display setting. A preceding Color Space Transform or a node color-space override may change that assumption.

| Node input | Input Color Space | Input Gamma |
| --- | --- | --- |
| DaVinci Wide Gamut / Intermediate | DaVinci Wide Gamut | DaVinci Intermediate |
| Rec.709 / Gamma 2.4 | Rec.709 | Gamma 2.4 |
| sRGB | Rec.709 | sRGB |
| ACEScct | ACES AP1 | ACEScct |
| ACEScg | ACES AP1 | Linear |
| ACES2065-1 | ACES AP0 | Linear |
| Linear Rec.709 | Rec.709 | Linear |
| Display P3 | P3-D65 | sRGB |
| Rec.2020 / Gamma 2.4 | Rec.2020 | Gamma 2.4 |
| Rec.2100 PQ | Rec.2020 | ST 2084 (PQ) |
| Rec.2100 HLG | Rec.2020 | HLG |

Additional explicit transfers are **Gamma 2.2** and **Rec.709 (Scene)**. The latter is the camera-style BT.709 OETF, not the Gamma 2.4 display EOTF. HLG requires Rec.2020 primaries. Other gamut/transfer combinations are available for workflows that deliberately use them; selecting an incorrect combination cannot be corrected automatically.

Do not add a second output display transform just for the plugin. Resolve retains responsibility for its input/output transforms, display rendering, tone mapping and gamut mapping. The plugin does not change project color-management settings, apply an ACES RRT/ODT, run a custom OCIO config or interpret every camera-log encoding. Convert an unsupported node encoding to a supported working space around the OFX.

## Automatic mode

**Automatic / Host Metadata** reads the OpenFX 1.5 source-clip color-space tag. The plugin declares its output as matching Source. Recognized explicit tags are mapped to the same native conversions used in manual mode. Generic tags such as `ofx_scene_linear` are insufficient because they do not specify primaries.

If the host omits the tag or reports an unsupported space, automatic rendering fails with a color-management message instead of guessing. Use **Color Managed** and set the node encoding explicitly. The read-only **Host Color Space** field refreshes on instance creation and user parameter edits. Support in the specific Resolve version must be verified in that host; a simulated OFX host test is not proof that Resolve supplies these metadata.

## HDR reference levels

**HDR Reference White (nits)** defines the display luminance represented by working-linear 1.0 for PQ and HLG; default 100 nits. It does not clamp highlights or perform tone mapping. Match this value to the intended effect reference level, especially when combining generated phosphor emission with HDR imagery.

**HLG Peak Luminance (nits)** defaults to 1000 nits. HLG decoding includes the reference OOTF and peak-dependent system gamma, with the inverse used on output. Both settings are independent of look presets. For SDR, linear and log inputs, they have no effect.

PQ/HLG have defined physical signal domains. Signed extensions outside those domains preserve mathematical headroom through artistic operations; they do not imply that negative luminance can be displayed.

## Neutrality and compatibility

Color conversion and the creative CRT effect are separate:

- **Bypass**, or disabling both stages, copies the incoming pixels unchanged, including alpha, negative values and HDR values. This also works when Auto metadata are unavailable.
- A neutral active effect round-trips the configured color encoding within floating-point tolerance. Use no pixel mix, scanlines, mask, bloom, exposure offset, black offset, curvature, vignette, convergence, noise, jitter, tracking or flicker; saturation 1 and **CRT Gamma 2.2**.
- CRT Gamma is a creative response control. In managed mode, 2.2 is the neutral value; it is not the input or output encoding selector. Look presets intentionally change image appearance.
- Input is unpremultiplied before color conversion. Filtering is performed on linear premultiplied samples when the source is premultiplied, and output is encoded before reapplying output premultiplication.
- **Legacy / Gamma 2.2** and **Legacy / Linear** retain the original selector IDs and rendering paths for saved projects. They do not provide the managed mode's signed/wide-gamut guarantees. New instances default to Color Managed, Rec.709 / Gamma 2.4.
- Look presets do not change Color Processing, Input Color Space, Input Gamma or HDR reference settings. Resolve stores these independently in the project. Web preset JSON contains creative parameters only.

The web app remains an SDR look playground with its original gamma-2.2 shader behavior. It is not a color-managed Resolve viewer or an HDR reference display; exact appearance across the browser and different Resolve display pipelines is not promised.

## Implementation and verification

`native/src/color.hpp` contains analytic transfer functions shared by CPU and CUDA. `scripts/generate-color-matrices.mjs` derives gamut matrices from primary chromaticities and applies Bradford D60/D65 adaptation for ACES. The native shader uses linear input/output in managed mode while keeping the original web/legacy path.

Tests cover published reference values, gamut/transfer round-trips, signed/HDR neutrality, alpha and premultiplication, CPU/CUDA agreement, and a simulated OFX host exercising manual/automatic rendering, unknown tags, preset isolation and exact bypass. Testing covers the implementation; full Resolve-version, RCM and ACES workflow validation still requires host testing.

Reference specifications:

- [Blackmagic Design: DaVinci Wide Gamut and Intermediate](https://documents.blackmagicdesign.com/InformationNotes/DaVinci_Resolve_17_Wide_Gamut_Intermediate.pdf)
- [Academy: ACEScct](https://docs.acescentral.com/encodings/acescct/)
- [ICC: sRGB](https://registry.color.org/rgb-registry/srgb)
- [ITU-R BT.2100: PQ and HLG](https://www.itu.int/rec/r-rec-bt.2100)
- [OpenFX color-space exchange](https://openfx.readthedocs.io/en/latest/Reference/api/file/ofxColour_8h.html)
