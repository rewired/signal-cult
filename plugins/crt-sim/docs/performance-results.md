# CRT SIM R&D performance matrix

Measured locally on 2026-09-14T16:23:52+02:00. These are standalone core-renderer measurements, not in-host DaVinci Resolve timings.

- CPU: Intel(R) Core(TM) i9-9900K CPU @ 3.60 GHz
- GPU: NVIDIA GeForce RTX 2070 (8 GB)
- NVIDIA driver: 610.88
- CUDA compiler: 12.8.61
- Build: Release
- CPU execution: 16 row-sliced worker threads, matching the OFX worker ceiling

| Backend | Resolution | Profile | Frames | ms/frame | fps |
| --- | ---: | --- | ---: | ---: | ---: |
| CPU/16t | 1920x1080 | default | 2 | 944.17 | 1.06 |
| CPU/16t | 3840x2160 | default | 1 | 4481.77 | 0.22 |
| CPU/16t | 1920x1080 | max | 2 | 6610.52 | 0.15 |
| CPU/16t | 3840x2160 | max | 1 | 29742.12 | 0.03 |
| CUDA | 1920x1080 | default | 60 | 10.73 | 93.17 |
| CUDA | 3840x2160 | default | 30 | 38.87 | 25.73 |
| CUDA | 1920x1080 | max | 60 | 48.33 | 20.69 |
| CUDA | 3840x2160 | max | 30 | 191.00 | 5.24 |

The default profile uses the parameter defaults and a generated color-gradient source. The max profile enables the Pixel / Sci-Fi stage and simultaneously drives signal noise, chroma processing, multi-scale glow, monochrome, screen motion and film grain to deliberately heavy settings. Timings include rendering only; input allocation and CPU-to-GPU upload are outside the timed loop.

Reproduce the matrix after a Release build:

```powershell
./scripts/benchmark.ps1 -Cuda -WriteReport
```

Results vary with driver, host scheduling, source format, thermal state and project color management. Resolve playback should be measured separately before publishing product performance claims.
