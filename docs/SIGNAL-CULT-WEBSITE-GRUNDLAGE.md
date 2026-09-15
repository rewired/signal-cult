# SIGNAL CULT – Inhaltsgrundlage für den SIGNAL-CULT-Bereich auf rewired-vfx

> Stand der Analyse: 15. September 2026  
> Quelle: aktueller Inhalt des lokalen `signal-cult`-Pakets  
> Zweck: Produkt-, Inhalts- und Technikbasis für den SIGNAL-CULT-Bereich innerhalb der übergeordneten Website **rewired-vfx**.

## Einordnung in die Dachmarke

**rewired-vfx** ist die Marke und die eigentliche Website. **SIGNAL CULT** ist eine Kollektion innerhalb dieser Website – keine eigenständige Dachmarke und keine separate Website.

Für Gestaltung und Navigation bedeutet das:

- rewired-vfx bleibt im globalen Header, Seitentitel und Footer sichtbar;
- SIGNAL CULT erhält eine starke eigene visuelle Atmosphäre, bleibt aber klar als Kollektion von rewired-vfx gekennzeichnet;
- globale Inhalte wie About, allgemeine Downloads, Kontakt, Impressum und Datenschutz gehören zur rewired-vfx-Ebene;
- der SIGNAL-CULT-Bereich konzentriert sich auf die kreative Idee, die drei Hauptprodukte, Demos, Presets und produktspezifische Dokumentation;
- eine sinnvolle URL wäre beispielsweise `/signal-cult/` mit Unterseiten wie `/signal-cult/broken-fm/`.

## 1. Kurzfassung

**SIGNAL CULT** ist eine von **rewired-vfx** entwickelte Sammlung experimenteller Videoeffekte. Im Zentrum stehen Signalzerfall, CRT-/Pixel-Ästhetik, zeitliches Feedback, Bewegungsartefakte und druckähnliche Rasterzerstörung.

Der aktuell website-relevante Produktkern enthält:

- **drei direkt im Browser nutzbare Hauptprodukte**;
- dieselben **drei nativen Windows-OpenFX-Plugins** für DaVinci Resolve;
- **118 dokumentierte Factory-Presets** aus BROKEN FM, CRT SIM und RASTER RUPTURE;
- lokale WebGL-2-Vorschauen für Bilder und Videos;
- Preset-Import und -Export im JSON-Format;
- native CPU-/CUDA-Komponenten, OFX-Adapter und Companion-Apps für ausgewählte Effekte;
- Tests, Build- und Installationsskripte;
- technische Dokumentation sowie ein illustriertes Benutzerhandbuch für BROKEN FM.

SIGNAL ROT, BUCKET ROT und GRID ROT sind frühe Beta-Studien. Sie sind momentan nicht Bestandteil der Produktzählung, Preset-Zählung oder primären Website-Kommunikation.

Die drei Hauptprodukte richten sich an visuelle Künstler, Motion Designer, Videoeditoren, VJs, Glitch-Art-Künstler und technische Look-Developer. Sie sind sowohl produktive Resolve-Werkzeuge als auch experimentelle Labore zur Entwicklung ungewöhnlicher Bildsprachen.

## 2. Empfohlene Positionierung

### Ein-Satz-Beschreibung

> SIGNAL CULT ist eine Sammlung radikaler visueller Instrumente für DaVinci Resolve und den Browser – entwickelt, um aus Signalmodulation, CRT-Strukturen und Rasterzerstörung eigenständige Bildsprachen zu formen.

### Kreative Kernbotschaft

> **Turn signal failure into a visual language.**

Die Website verkauft nicht in erster Linie Software oder technische Spezifikationen, sondern kreatives Potenzial: drei Instrumente, die Ausgangsmaterial nicht bloß dekorieren, sondern neu interpretieren. SIGNAL CULT soll Künstler dazu einladen, Signale zu formen, kontrolliert zu destabilisieren und unverwechselbare Looks zwischen Präzision und Zerfall zu entwickeln.

Unterstützende Botschaft:

> **Three instruments. Endless ways to break the image.**

### Website-Teaser

> Verforme Bilder wie Signale. Erzeuge modulierte Trägerwellen, phosphoreszierende Displaywelten und beschädigte Druckraster – von präzise kontrollierten Texturen bis zu vollständigem visuellem Zerfall.

### Zentrales Nutzenversprechen

SIGNAL CULT bietet nicht nur vorgefertigte Glitch-Overlays. Die Effekte greifen in eigene Signal-, Speicher-, Bewegungs- und Rastermodelle ein. Dadurch entstehen Looks, die strukturell auf das Quellbild reagieren und sich detailliert steuern lassen.

### Abgrenzung

- BROKEN FM moduliert eine erzeugte Trägerwelle mit dem Bildinhalt.
- CRT SIM modelliert CRT-, Signal-, Glow- und Pixelstufen.
- RASTER RUPTURE kombiniert gerichtete Rasterzerstörung, Oberflächenschäden, Maskenrouting und zeitliche Ablagerung.

Die Sammlung sollte daher nicht pauschal als „VHS-Filterpaket“ oder „Overlay-Bundle“ vermarktet werden.

## 3. Paketübersicht

| Modul | Browser | Windows OFX | Companion | Presets | Kerngedanke |
| --- | ---: | ---: | ---: | ---: | --- |
| **BROKEN FM** | Ja | Ja | Ja | 56 | Phasen- und Frequenzmodulation einer Trägerwelle |
| **CRT SIM** | Ja | Ja | Ja | 26 | CRT-, Pixel-, Sci-Fi-, Signal- und Glow-Simulation |
| **RASTER RUPTURE** | Ja | Ja | Nein | 36 | Rasterrisse, Druckschäden, Masken und Feedback |
| **Gesamt** | **3** | **3** | **2** | **118** | Drei vollständige visuelle Instrumente |

Die drei ROT-Studien werden in dieser Tabelle bewusst nicht gezählt. Sie können intern oder in einem optionalen Beta-Archiv erwähnt werden, aber nicht als Produkte, Presets oder Parameter des aktuellen Angebots.

## 4. Die drei Hauptprodukte im Detail

### 4.1 BROKEN FM

#### Produktidee

BROKEN FM übersetzt Bildinformationen in die Phase oder räumliche Frequenz einer periodischen Trägerwelle. Das Bild wird nicht mit Störlinien überlagert, sondern durch die Verformung des Trägers lesbar gemacht.

`INPUT → MODULATION SOURCE → PHASE/FREQUENCY INTEGRATION → CARRIER → LINE SHAPING`

#### Wesentliche Funktionen

- Phasenmodulation (**PM**) und integrierte räumliche Frequenzmodulation (**FM**);
- Luminanz, invertierte Luminanz, Kanten, lokaler Kontrast oder Luminanz plus Kanten als Modulationsquelle;
- Sinus, Dreieck, Sägezahn, Rechteck, Noise, Wavetable und Audio als Träger;
- Linien- oder Rohwellenform-Ausgabe;
- Scan-Winkel, Frequenz, Phase, PWM/Skew, Linienbreite und Weichheit;
- deterministische Instabilität mit Seed, Jitter, Rauschen, Drift und Zeitjitter;
- Dropout und Line Tear innerhalb des Signalmodells;
- rekursiver Sequential Loop oder Finite Window mit bis zu acht Frames;
- Feedback in Phase oder Modulation inklusive Verschiebung und Phasenrotation;
- Mono, Input Color und RGB Phase;
- Phosphor-Persistence in der Browserdarstellung;
- zwei LFOs, Audioanalyse und vier Modulationsslots;
- Video, Standbild, Live-Kamera und GPU-Testbild;
- PNG-Capture sowie zahlreiche Diagnoseansichten.

#### Umfang und Status

- 56 Factory-Presets und 82 Parameter im eingefrorenen Host-Vertrag;
- WebGL-2-Referenzoberfläche;
- Windows-OFX und Tauri-Companion;
- illustriertes Handbuch als Markdown, HTML und PDF;
- dokumentierter nativer Stand: OFX 0.1.0.

#### Grenzen

- Audioquelle, importierte Wavetables und bestimmte zeitliche Feedback-/Persistence-Funktionen sind nicht vollständig im OFX abgebildet.
- Die Browser-Farbverarbeitung ist nicht farbmanagementfähig.
- Die Projektunterlagen enthalten widersprüchliche Angaben zu einem BROKEN-FM-CPU-Fallback; diese Aussage muss vor Veröffentlichung praktisch geprüft werden.
- Der Effekt kann flackernde und kontrastreiche Muster erzeugen. Eine Photosensitivitätswarnung ist erforderlich.

### 4.2 CRT SIM

#### Produktidee

CRT SIM ist ein kombinierbarer CRT-, Pixelmonitor- und Science-Fiction-Display-Effekt. Pixel-/Sci-Fi- und CRT-Stufe lassen sich unabhängig aktivieren.

#### Wesentliche Funktionen

- 12 Phosphormasken, Scanlines, Beam Width, Belichtung, Gamma, Sättigung, Krümmung, Vignette und RGB-Konvergenz;
- 10 Rauschtypen mit Körnung, Clustering, Interferenz, Jitter, Tracking und Flicker;
- Chroma-Delay/-Bleed sowie getrennte Luma-/Chroma-Schärfe;
- statischer oder animierter Hue Drift;
- **Glow 2.0** mit Threshold, Soft Knee, drei Skalen, Radius, Spread, Diffusion und Tube Emission;
- monochrome Tönung mit freier Farbe und wählbarem Luminanzmodell;
- Vertical Roll, Shutter Scan, Shake und Sync Drift;
- 8 Pixelraster und 7 Paletten inklusive eigener Farbe;
- Preset-Galerie mit Vorschaubildern des aktuellen Frames.

#### Umfang und Status

- 26 Factory-Presets: 12 CRT- und 14 Sci-Fi-Looks;
- WebGL-2-Playground;
- Windows-OFX 0.8.0 mit CUDA und CPU-Fallback;
- optionale Tauri-Companion-App;
- 32-Bit-Float-RGBA mit Alpha-/Premultiplication-Behandlung;
- Eingangs-Farbmanagement für unter anderem DWG/Intermediate, Rec.709, sRGB, ACES, P3-D65 und Rec.2020 PQ/HLG.

#### Grenzen

- Künstlerisches Modell, keine kalibrierte physikalische Röhrensimulation.
- Keine echte Interlace-Rekonstruktion und kein vollständiger PAL-/NTSC-Decoder.
- Glow ist räumlich und keine echte zeitliche Phosphor-Persistence.
- Browser, CPU und CUDA sind visuell, aber nicht bitgenau gleich.
- Die Browseransicht ist ein SDR-Look-Playground, kein verbindlicher Resolve-Display-Match.

### 4.3 RASTER RUPTURE

#### Produktidee

RASTER RUPTURE verbindet gerichtete Rasterzerstörung mit trockenen Druckoberflächen, Bewegungsresten, Xerox-artigen Kopiergenerationen, Spot-Color-Signalen und frei routbaren Masken.

#### Wesentliche Funktionen

- zweistufiger GPU-Framegraph für Ink/Paper und Rupture/Temporal;
- frei drehbare, seitenverhältniskorrekte Rupture-Richtung;
- optionales senkrechtes Cross-Rupture-System;
- Tear-Layer, trockene Fasern, Toner-Stipple und kantensensitive Fotodetails;
- Micro Echoes mit Dichteverlust und Perforation;
- animierte Xerox-Streifen mit Generationen, Drift und Dropout;
- prozedurale Dirt Masks mit Klumpen, Pinholes, Streifen und harter Erosion;
- Spot-Color-Bloom mit Signal-Kern, Halo und maskengetriebenem Zerfall;
- Ping-Pong-Feedback mit getrennten Schreib- und Leserouten;
- Bewegungsproxy über Frame-Differenz;
- eine Bild- oder MP4-Maske für neun Effektziele;
- je Ziel ein XY-Pad für bipolaren Maskeneinfluss und Winkelversatz von −90° bis +90°;
- Luminanz-, RGB- oder Alphakanal als Maske;
- **Source as Mask** und expliziter **No mask**-Modus.

#### Umfang und Status

- 36 Factory-Presets in fünf Effektcharakteren;
- WebGL-2-Browser-Vorschau;
- Windows-x64-OFX 0.2.0 mit CUDA und CPU-Fallback;
- 32-Bit-Float-RGBA für Source/Output und optionale Float-RGBA-/Alpha-Maske;
- Source und Maske werden in Resolve am selben Timeline-Zeitpunkt angefordert.

#### Grenzen

- Im Browser ist kein OpenEXR-Decoder enthalten.
- Bewegung nutzt derzeit Frame-Differenzen statt dichtem Optical Flow.
- Zeitlicher Zustand wird bei Sprüngen und Host-Cache-Purges zurückgesetzt.
- Browser und native Fassung teilen Parameterkonzepte, können aber laufzeitbedingt abweichen.

## 5. Gemeinsame Produkterfahrung

- dunkle Oberfläche mit Mint-Akzentfarbe;
- lokaler Betrieb ohne Cloud-Konto oder Medien-Upload;
- Video- und Standbildquellen, teilweise Live-Kamera und Testsignal;
- validierter JSON-Preset-Import und benannter Export;
- direkte Regler, Reset-Verhalten und Statusmeldungen;
- WebGL-2-Echtzeitvorschau;
- gemeinsame UI-Grundlage mit BROKEN FM als Master.

Die Module können visuell als Familie auftreten, obwohl ihre Rendering-Modelle unabhängig bleiben.

## 6. Zielgruppen

### Primäre Zielgruppen

- **Videoeditoren und Colorists** mit DaVinci-Resolve-Workflow;
- **Motion Designer** mit Bedarf an ungewöhnlicher Signal- und Displayästhetik;
- **VJs und Live-Visual-Künstler**;
- **Glitch-Art- und Experimentalfilm-Künstler**;
- **Musikvideo- und Titel-Designer**;
- **Look-Developer und technische Künstler**.

### Sekundäre Zielgruppen

- Entwickler von OFX-/GPU-Effekten;
- Studierende und Lehrende in Motion Design und Creative Coding;
- Content Creator, die lokale Werkzeuge ohne Upload bevorzugen.

## 7. Starke Argumente für die Website

### Funktional

- lokale Medienverarbeitung;
- keine npm-Installation oder Frontend-Kompilierung für die Demos;
- schnelle Look-Entwicklung über Presets;
- JSON-Austausch eigener Looks;
- drei native Resolve-Plugins;
- deterministische Seeds in mehreren Modulen;
- dokumentierte Tests, Grenzen, Lizenz und Third-Party-Komponenten.

### Kreativ

- kontrollierter statt rein zufälliger Glitch;
- Reaktion auf Luminanz, Kanten, Bewegung, Rasterposition oder Masken;
- subtile Displaytextur bis extreme Zerstörung;
- zeitliche, räumliche, signal- und druckbasierte Bildmodelle;
- sofort nutzbare Looks plus tiefe manuelle Steuerung.

## 8. Empfohlene Struktur des SIGNAL-CULT-Bereichs

### 8.1 SIGNAL-CULT-Übersichtsseite

1. **Hero** – Logo, Claim, Showreel/Vorher-Nachher und klare CTAs.
2. **Product Overview** – drei Effektkarten für BROKEN FM, CRT SIM und RASTER RUPTURE.
3. **Creative Potential** – drei unterschiedliche Wege vom Ausgangsbild zur eigenen visuellen Sprache.
4. **Why SIGNAL CULT** – bildreaktive Signalmodelle, tiefe Kontrolle und 118 Ausgangspunkte.
5. **Workflow** – Medium laden, Preset als Startpunkt wählen und den Look weit über das Preset hinaus entwickeln.
6. **Compatibility** – Browser und OFX klar trennen.
7. **Free to use** – kostenlose kreative Nutzung als praktischer Vorteil, nicht als Markenidee.
8. **License & Download** – Nutzung, Redistribution und Repository.
9. **Safety Note** – Photosensitivitätswarnung.

### 8.2 Collection-Seite

Vergleich der drei Hauptprodukte mit Filtern für:

- Browser / OFX;
- zeitlich / räumlich / signalbasiert / displaybasiert;
- subtil / aggressiv;
- Signal / Display / Raster;
- mit Feedback oder Masken.

### 8.3 Produktseiten

Jede Effektseite sollte dieselbe Struktur verwenden:

1. Name, Ein-Satz-Idee und Status;
2. Video-Loop oder Vorher/Nachher;
3. „What it does“;
4. zentrale Funktionen;
5. kuratierte Presets;
6. unterstützte Plattformen;
7. Bedienablauf;
8. technische Eckdaten;
9. bekannte Grenzen;
10. Download-, Demo- und Dokumentationslinks.

### 8.4 Download und Installation

Die Seite muss unterscheiden zwischen:

- **Browser Tools:** lokal über den Repository-Server;
- **nativen OFX-Bundles:** für DaVinci Resolve unter Windows x64;
- **Companion-Apps:** separate Editoren für BROKEN FM und CRT SIM.

Ein kombinierter Installer für die ganze Sammlung ist laut Projektdokumentation noch nicht vorhanden. Die Website darf nicht den Eindruck eines fertigen Gesamtinstallers erwecken, solange dieser nicht gebaut und getestet wurde.

### 8.5 Dokumentation

- Quick Start;
- Installation;
- Browser Tools;
- DaVinci Resolve / OFX;
- Presets und JSON-Austausch;
- Farbmanagement und Performance;
- bekannte Einschränkungen;
- Lizenz und Third-Party-Komponenten;
- BROKEN-FM-Benutzerhandbuch.

### 8.6 Collection Story / Manifest

> SIGNAL CULT betrachtet Video nicht als fertiges Bild, sondern als Material, das übertragen, gespeichert, moduliert, abgetastet, beschädigt und wieder aufgebaut werden kann.

## 9. Einbindung in die rewired-vfx-Navigation

```text
rewired-vfx
├── Home
├── Products / Collections
│   └── SIGNAL CULT
│       ├── Overview
│       ├── BROKEN FM
│       ├── CRT SIM
│       ├── RASTER RUPTURE
│       ├── Try in Browser
│       └── Documentation
├── Downloads
├── About rewired-vfx
└── GitHub
```

Der globale rewired-vfx-Header sollte erhalten bleiben. Innerhalb von SIGNAL CULT kann eine kompakte Subnavigation aus **Overview**, **Effects**, **Try**, **Docs** und **Download** verwendet werden. Eine Breadcrumb wie `rewired-vfx / SIGNAL CULT / BROKEN FM` hält die Markenebenen jederzeit verständlich.

## 10. Fertige englische Website-Texte

### Hero – produktorientiert

**Eyebrow:** Three instruments. Endless failure modes.  
**Headline:** Turn signal failure into a visual language.  
**Subline:** Shape footage through phase modulation, living CRT structures and directed raster destruction – with enough control to make every breakdown your own.  
**CTA 1:** Explore the effects  
**CTA 2:** View on GitHub

### Hero – atmosphärisch

**Headline:** Video is a signal. Break it beautifully.  
**Subline:** SIGNAL CULT is a collection of local visual instruments for modulation, memory, decay, display texture and controlled image failure.  
**CTA 1:** Enter SIGNAL CULT  
**CTA 2:** Try the browser tools

### About-Text

> SIGNAL CULT is a collection of experimental visual instruments by rewired-vfx. BROKEN FM, CRT SIM and RASTER RUPTURE transform footage through signal modulation, living display structures, temporal memory and damaged print processes. Each effect opens a different path from source image to personal visual language. All three can be explored locally in the browser and used as native OpenFX plugins in DaVinci Resolve on Windows. Creative use is free.

### Effektkarten

**BROKEN FM**  
Shape video through real phase and spatial-frequency modulation, deterministic instability, feedback and audio/LFO routing.

**CRT SIM**  
Build CRT, pixel-monitor and sci-fi display looks with phosphor masks, signal noise, Glow 2.0, motion and managed native color workflows.

**RASTER RUPTURE**  
Tear images into directional bands, dry fibers, Xerox generations, routed masks and accumulated motion residue.

## 11. Anforderungen und Kompatibilität

### Browser-Werkzeuge

- aktueller Desktop-Browser mit WebGL 2;
- lokaler HTTP-Server aus dem Paket;
- keine npm-Installation und kein Frontend-Build;
- Medien bleiben lokal auf dem Gerät;
- Videoformat-Unterstützung hängt von Browser und Betriebssystem ab;
- die Demos dienen Look-Development und Experiment, nicht allgemeinem Videoexport.

### Native Plugins

- Windows x64 und DaVinci Resolve mit OpenFX-Unterstützung;
- native Module: BROKEN FM, CRT SIM und RASTER RUPTURE;
- CUDA für GPU-Pfade; CRT SIM und RASTER RUPTURE dokumentieren CPU-Fallbacks;
- kein Metal oder OpenCL und keine macOS-Veröffentlichung.

### Build-Umgebung für Entwickler

- Visual Studio 2022 C++ Tools;
- CMake ab 3.24;
- Node.js ab 22.13.0;
- CUDA 12.8 für GPU-Builds;
- Rust/Cargo und Tauri-/WebView2-Toolchain für Companion-Builds.

Build-Anforderungen dürfen nicht mit Endnutzeranforderungen vermischt werden.

## 12. Technischer Aufbau

```text
signal-cult/
├── plugins/
│   ├── broken-fm/        Browser, Shader, OFX, Companion, Presets, Handbuch
│   ├── crt-sim/          Browser, CPU/CUDA, OFX, Companion, Presets
│   └── raster-rupture/   Browser plus CUDA/CPU-OFX
├── scripts/              Start, Tests und native Builds
├── docs/                 Architektur- und Integrationsdokumentation
├── dist/                 Lokale Build-Ausgaben
├── CMakeLists.txt        Gemeinsamer nativer Build-Einstieg
├── LICENSE
└── THIRD_PARTY_NOTICES.md
```

### Vorhandene Website-Assets

- horizontales SIGNAL-CULT-/rewired-vfx-Logo als SVG;
- separate Modul-Favicons;
- dunkle UI mit Mint-Farbe als Markenreferenz;
- vollständige Browseroberflächen als Demo-/Screenshot-Quelle;
- Presetkataloge aller Effekte;
- vier BROKEN-FM-Handbuch-Screenshots;
- BROKEN-FM-Handbuch als HTML, Markdown und PDF.

## 13. Visuelle Richtung

Die vorhandene Oberfläche legt bereits eine klare Richtung nahe:

- fast schwarzer Hintergrund (`#080b0c`);
- dunkle Kartenflächen (`#101516`);
- helle Mint-Akzentfarbe (`#8dffd8`);
- zurückhaltendes Grau für erklärende Texte;
- technische Typografie mit gesperrten Versalien;
- dünne Rahmen statt schwerer Schatten;
- Effektbilder und Videos als Hauptträger der Farbe.

Empfohlen ist ein hochwertiges Signal-Labor: präzise, dunkel, reduziert und technisch – ohne generische VHS-Sticker oder dauerhaft unruhige Glitch-Animationen.

### Bewegungsprinzipien

- Animation nur zur Erklärung des jeweiligen Effekts;
- reduzierte Standardbewegung und `prefers-reduced-motion`;
- keine stark flackernden Hero-Sequenzen;
- intensive Vorschauen erst nach Warnung oder bewusster Nutzeraktion.

## 14. Zusätzlich benötigte Medien

Der Quellcode liefert die Effekte, aber noch kein vollständiges Marketing-Medienpaket. Für eine starke Website sollten produziert werden:

1. ein 20–40 Sekunden langes Collection-Showreel;
2. pro Modul mindestens ein kurzer Loop und ein Hero-Bild;
3. Vorher/Nachher-Paare mit identischem Ausgangsmaterial;
4. Resolve-Screenshots der drei OFX-Plugins;
5. Screenshots der BROKEN-FM- und CRT-SIM-Companions;
6. kuratierte Preset-Galerien statt aller 118 relevanten Presets auf der SIGNAL-CULT-Übersichtsseite;
7. Downloads mit Version, Dateigröße und Prüfsumme;
8. getestete Installationsanleitungen für aktuelle Resolve-Versionen;
9. ein Social-Preview-Bild im Format 1200 × 630.

Alle Demoquellen müssen lizenzrechtlich geklärt sein.

## 15. Sicherheit und Barrierefreiheit

### Photosensitivität

Mehrere Effekte können Flackern, harte Kontraste und schnelle Helligkeitswechsel erzeugen. Die Website sollte:

- vor intensiven Demos warnen;
- Pause/Stop anbieten;
- eine bewegungsreduzierte Alternative bereitstellen;
- kritische Animationen nicht als dauerhaften Hintergrund einsetzen.

### Allgemein

- ausreichender Kontrast;
- vollständige Tastaturbedienbarkeit und sichtbarer Fokus;
- Alternativtexte und Videobeschreibungen;
- Modulstatus nicht allein durch Farbe kennzeichnen;
- technische Begriffe verständlich erklären.

## 16. Lizenz und rechtliche Kommunikation

Der Originalcode steht unter **BSD-3-Clause mit Commons Clause 1.0**. Für die Website sind drei Aussagen zentral:

1. Die Werkzeuge dürfen kostenlos verwendet werden, auch für bezahlte Video- und VFX-Arbeit.
2. Gerenderte Videos benötigen nicht allein wegen der Nutzung einen SIGNAL-CULT-Credit.
3. Der Verkauf eines Produkts oder Dienstes, dessen Wert vollständig oder wesentlich aus dieser Software entsteht, ist ohne separate Erlaubnis eingeschränkt.

Die Lizenz ist eine nachgeordnete praktische Information und keine kreative Kernbotschaft. Formal ist SIGNAL CULT aufgrund der Commons Clause **source-available**, nicht OSI Open Source. In Download- und Lizenzbereichen kann knapp mit **„Free for creative work“** gearbeitet werden. Bei Redistribution müssen Copyright-, BSD- und Commons-Clause-Hinweise erhalten bleiben. OpenFX SDK, nlohmann/json, Tauri/Rust sowie NVIDIA- und Microsoft-Komponenten behalten eigene Bedingungen.

Diese Zusammenfassung ersetzt keine Rechtsberatung. Die Website sollte die vollständige Lizenz und die Third-Party-Notices verlinken.

## 17. Vor Veröffentlichung zu prüfen

- Es gibt noch keinen kombinierten Installer für die komplette Sammlung.
- Die gleichzeitige Verwendung aller nativen Plugins ist noch keine vollständig veröffentlichte Resolve-Kompatibilitätsmatrix.
- Lokale Build-Artefakte sind keine veröffentlichten Releases.
- SIGNAL ROT, BUCKET ROT und GRID ROT sind irrelevante Beta-Studien und bleiben außerhalb der Produkt-, Preset- und Parameterzählung.
- Browserdemos besitzen keinen allgemeinen Videoexport.
- macOS, Metal und OpenCL werden aktuell nicht unterstützt.
- Die CRT-Browser-Vorschau ist kein verbindlicher farbverwalteter Resolve-Match.
- RASTER RUPTURE enthält im Browser weder EXR-Decoder noch dichten Optical Flow.
- BROKEN FM besitzt native Paritätsgrenzen bei Audio, Wavetables und zeitlichem Feedback.
- Die widersprüchlichen Angaben zum BROKEN-FM-CPU-Fallback müssen bereinigt werden.
- Automatisierte Tests ersetzen keine praktische Prüfung konkreter Resolve-, Treiber- und GPU-Versionen.

Diese Punkte sollten offen als **Current status** oder **Known limitations** kommuniziert werden.

## 18. SEO- und Metadaten-Grundlage

### Seitentitel

`SIGNAL CULT — Experimental Video Instruments | rewired-vfx`

### Meta Description

`Turn signal failure into a visual language with BROKEN FM, CRT SIM and RASTER RUPTURE — three experimental video instruments by rewired-vfx for DaVinci Resolve and the browser.`

### Suchbegriffe

- DaVinci Resolve free OFX plugins;
- experimental video effects;
- CRT effect plugin;
- WebGL video effects;
- glitch video plugin;
- phase modulation video;
- raster distortion;
- CUDA OFX plugin;
- local browser video effects.

## 19. Calls to Action

### Primär

- Explore the effects
- Try in browser
- Download for Resolve

### Sekundär

- Browse presets
- Read the manual
- View source on GitHub
- Check compatibility
- Build from source

„Download the collection“ sollte erst verwendet werden, wenn ein zusammenhängendes, getestetes Distributionspaket existiert. Bis dahin sind modulbezogene Downloads präziser.

## 20. Umsetzungsumfang

### Minimal sinnvoller MVP

- responsive SIGNAL-CULT-Übersichtsseite innerhalb der bestehenden rewired-vfx-Site;
- globaler rewired-vfx-Header, Footer und Breadcrumb;
- drei Effektkarten und Detailabschnitte;
- Status Browser / OFX / Companion;
- eingebettete oder verlinkte Browserdemos;
- Download-/GitHub-Bereich;
- Anforderungen, Grenzen, Lizenz und Safety;
- Impressum und Datenschutz abhängig vom Hosting.

### Zweite Ausbaustufe

- filterbare Preset-Galerie und Vorher/Nachher-Slider;
- kurze Effekt-Loops;
- versionierte Downloads mit Checksums;
- Dokumentationsnavigation und Release Notes;
- automatisch aktualisierte Versionsanzeigen;
- ausgewählte, performancebegrenzte Live-Demos.

## 21. Redaktionelle Leitlinien

- Produktstatus immer explizit nennen.
- „Kostenlos nutzbar“ nicht mit „uneingeschränkt weiterverkaufbar“ verwechseln.
- Lizenz und kostenlose Nutzung als unterstützende Fakten behandeln, nicht als Hero oder Markenbotschaft.
- SIGNAL CULT konsequent als Kollektion von rewired-vfx kennzeichnen.
- Native und Browserfunktionen nicht vermischen.
- WebGL nicht als pixelidentisch mit OFX bewerben.
- Tests nicht als universelle Resolve-Kompatibilität darstellen.
- Fachbegriffe erklären und die Eigenständigkeit der Signalmodelle bewahren.
- Tool-Bezeichnungen unverändert lassen; die Website kann deutsch, englisch oder zweisprachig sein.
- Photosensitivität sichtbar und frühzeitig adressieren.

## 22. Schlussfolgerung

SIGNAL CULT enthält bereits fast alle fachlichen Grundlagen für eine umfangreiche Produktwebsite: klare visuelle Identität, drei relevante Hauptprodukte, 118 Presets, drei Browseroberflächen, drei Resolve-Plugins, zwei Companion-Apps, Dokumentation, Tests und Lizenztexte.

Es fehlt hauptsächlich die redaktionelle und visuelle Verpackung: kuratierte Demo-Medien, belastbare Downloads, aktuelle Kompatibilitätsprüfung und eine saubere Einbindung der Kollektion in das Design- und Navigationssystem von rewired-vfx.

Die stärkste Erzählung für den SIGNAL-CULT-Bereich lautet:

> **Turn signal failure into a visual language. SIGNAL CULT by rewired-vfx eröffnet mit drei eigenständigen Instrumenten neue kreative Räume zwischen Signalmodulation, CRT-Ästhetik und Rasterzerstörung.**
