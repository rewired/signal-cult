from __future__ import annotations

import json
import re
from pathlib import Path

from reportlab import rl_config
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
MANUAL_DIR = ROOT / "docs" / "user-manual"
OUTPUT = ROOT / "output" / "pdf" / "BROKEN_FM_USER_MANUAL_0.1.0.pdf"
PAGE_W, PAGE_H = A4

INK = colors.HexColor("#17201e")
MUTED = colors.HexColor("#596b66")
ACCENT = colors.HexColor("#16a881")
WARNING = colors.HexColor("#b86b00")
WARNING_LIGHT = colors.HexColor("#fff3df")
LIGHT = colors.HexColor("#f2f7f5")
LINE = colors.HexColor("#cad7d3")
DARK = colors.HexColor("#07100e")

rl_config.invariant = True


def register_fonts() -> None:
    font_dir = Path("C:/Windows/Fonts")
    pdfmetrics.registerFont(TTFont("ManualSans", font_dir / "segoeui.ttf"))
    pdfmetrics.registerFont(TTFont("ManualSansBold", font_dir / "segoeuib.ttf"))
    pdfmetrics.registerFont(TTFont("ManualMono", font_dir / "consola.ttf"))


register_fonts()
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="ManualH1", fontName="ManualSansBold", fontSize=23, leading=27, textColor=INK, spaceAfter=8 * mm))
styles.add(ParagraphStyle(name="ManualH2", fontName="ManualSansBold", fontSize=16, leading=20, textColor=ACCENT, spaceBefore=3 * mm, spaceAfter=4 * mm))
styles.add(ParagraphStyle(name="ManualH3", fontName="ManualSansBold", fontSize=10.5, leading=13, textColor=INK, spaceAfter=1.5 * mm))
styles.add(ParagraphStyle(name="ManualBody", fontName="ManualSans", fontSize=9.2, leading=13.5, textColor=INK, spaceAfter=3 * mm))
styles.add(ParagraphStyle(name="ManualSmall", fontName="ManualSans", fontSize=7.8, leading=10.5, textColor=MUTED))
styles.add(ParagraphStyle(name="ManualMono", fontName="ManualMono", fontSize=7.2, leading=9, textColor=ACCENT))
styles.add(ParagraphStyle(name="ManualCaption", fontName="ManualSans", fontSize=8, leading=11, textColor=MUTED, alignment=TA_LEFT, spaceBefore=2 * mm))
styles.add(ParagraphStyle(name="ManualNotice", fontName="ManualSans", fontSize=8.7, leading=13, textColor=INK))


def cover(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFillColor(DARK)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#0d2d26"))
    canvas.circle(PAGE_W * 0.83, PAGE_H * 0.78, 70 * mm, stroke=0, fill=1)
    canvas.setFillColor(ACCENT)
    canvas.setFont("ManualMono", 9)
    canvas.drawString(24 * mm, PAGE_H - 42 * mm, "END-USER DOCUMENTATION")
    canvas.setFillColor(colors.HexColor("#e5efec"))
    canvas.setFont("ManualSansBold", 52)
    canvas.drawString(22 * mm, PAGE_H - 82 * mm, "BROKEN")
    canvas.drawString(22 * mm, PAGE_H - 103 * mm, "FM")
    canvas.setFillColor(colors.HexColor("#b7c9c4"))
    text = canvas.beginText(24 * mm, 72 * mm)
    text.setFont("ManualSans", 12)
    text.setLeading(17)
    for line in [
        "Real-time video frequency modulation.",
        "Companion UI and OFX parameter reference.",
        "Every exposed parameter, explained.",
    ]:
        text.textLine(line)
    canvas.drawText(text)
    canvas.setFillColor(colors.HexColor("#829690"))
    canvas.setFont("ManualMono", 8)
    canvas.drawString(24 * mm, 32 * mm, "VERSION 0.1.0 / EN / 82 PARAMETERS / 56 FACTORY PRESETS")
    canvas.restoreState()


def body_page(canvas, doc) -> None:
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, PAGE_H - 15 * mm, PAGE_W - 18 * mm, PAGE_H - 15 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("ManualMono", 7.5)
    canvas.drawString(18 * mm, PAGE_H - 11 * mm, "BROKEN FM / USER MANUAL 0.1.0")
    canvas.drawRightString(PAGE_W - 18 * mm, 10 * mm, f"{doc.page - 1:02d}")
    canvas.restoreState()


doc = BaseDocTemplate(
    str(OUTPUT),
    pagesize=A4,
    leftMargin=18 * mm,
    rightMargin=18 * mm,
    topMargin=21 * mm,
    bottomMargin=17 * mm,
    title="BROKEN FM User Manual 0.1.0",
    author="rewired-vfx",
    subject="End-user manual and complete parameter reference",
)
cover_frame = Frame(0, 0, PAGE_W, PAGE_H, id="cover-frame", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
body_frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="body-frame", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
doc.addPageTemplates([
    PageTemplate(id="Cover", frames=[cover_frame], onPage=cover),
    PageTemplate(id="Body", frames=[body_frame], onPage=body_page),
])


def parameter_rows():
    text = (MANUAL_DIR / "BROKEN_FM_USER_MANUAL.md").read_text(encoding="utf-8")
    rows = []
    group = None
    in_reference = False
    pattern = re.compile(r"^\| \*\*(.+?)\*\* \(`([^`]+)`\) \| (.*?) \| (.*?) \| (.*?) \|$")
    for line in text.splitlines():
        if line == "## Complete parameter reference":
            in_reference = True
            continue
        if in_reference and line.startswith("## "):
            break
        if in_reference and line.startswith("### "):
            group = line[4:]
            continue
        match = pattern.match(line)
        if match:
            rows.append((group, *match.groups()))
    return rows


def card(label: str, parameter_id: str, value_range: str, default: str, description: str):
    heading = Paragraph(label, styles["ManualH3"])
    identifier = Paragraph(parameter_id, styles["ManualMono"])
    meta = Paragraph(f"<b>Values</b>  {value_range}<br/><b>Default</b>  {default}", styles["ManualSmall"])
    body = Paragraph(description, styles["ManualBody"])
    table = Table([[heading, identifier], [meta, ""], [body, ""]], colWidths=[doc.width * 0.72, doc.width * 0.28])
    table.setStyle(TableStyle([
        ("SPAN", (0, 1), (1, 1)),
        ("SPAN", (0, 2), (1, 2)),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5 * mm),
    ]))
    return KeepTogether([table, Spacer(1, 3 * mm)])


story = [Spacer(1, 1), NextPageTemplate("Body"), PageBreak()]
story += [
    Paragraph("About BROKEN FM", styles["ManualH1"]),
    Paragraph("BROKEN FM turns image structure into a generated electronic signal. It is not a displacement, crop, or scaling effect: source pixels are analyzed as modulation while the carrier is built in output pixel space.", styles["ManualBody"]),
    Table([[Paragraph("<b>Photosensitivity warning.</b> BROKEN FM can generate flashing, flickering, and high-contrast moving patterns. The application shows this warning before the renderer or test pattern starts. Its checkbox suppresses future warnings on the same device; clearing local application storage restores it.", styles["ManualNotice"])]], colWidths=[doc.width], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), WARNING_LIGHT), ("BOX", (0, 0), (-1, -1), 1, WARNING), ("PADDING", (0, 0), (-1, -1), 5 * mm)])),
    Spacer(1, 4 * mm),
    Table([[Paragraph("<b>Native OFX v0.1 capability note.</b> PM/FM, procedural carriers, LFO routing, instability, dropout, color, and output shaping run natively. Audio carrier/analysis, imported custom wavetable payloads, feedback history, and phosphor history remain parity gates. The Companion session disables unsupported choices where possible; shared Resolve enum and matrix controls may still expose combinations that the native renderer rejects instead of approximating.", styles["ManualNotice"])]], colWidths=[doc.width], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), LIGHT), ("BOX", (0, 0), (-1, -1), 1, ACCENT), ("PADDING", (0, 0), (-1, -1), 5 * mm)])),
    Spacer(1, 7 * mm),
    Paragraph("Quick start", styles["ManualH2"]),
]

quick_steps = [
    ("1. Start from a preset", "Choose a factory preset in the header and use previous/next to explore the range."),
    ("2. Choose the source", "After the warning is acknowledged, Test pattern is active by default. Load video enables Play; Test pattern pauses it."),
    ("3. Shape modulation", "Choose source analysis, gain/bias, threshold, and overall Modulation Gain."),
    ("4. Choose PM or FM", "PM changes phase locally. FM accumulates frequency change along Scan Angle."),
    ("5. Add controlled motion", "Use Instability or route LFO/audio analysis sources in OSC."),
    ("6. Save or apply", "Save JSON stores the effect state. In a Resolve session, Apply returns it to OFX."),
]
for title, body in quick_steps:
    story.append(KeepTogether([Paragraph(title, styles["ManualH3"]), Paragraph(body, styles["ManualBody"])]))

story += [PageBreak(), Paragraph("Interface tour", styles["ManualH1"])]
shots = [
    ("01-main-interface.png", "Main interface at 1920 x 1080 using 20 COLORED RAZORWIRE."),
    ("02-osc-lfo.png", "OSC/LFO modal with carrier preview, two LFOs, and modulation matrix."),
    ("03-setup-routing.png", "Setup modal showing active dropout and feedback connection points."),
    ("04-debug-overlay.png", "Optional Debug View overlay in the lower-right of the video preview."),
]
for index, (filename, caption) in enumerate(shots):
    image = Image(str(MANUAL_DIR / "assets" / filename), width=174 * mm, height=97.875 * mm)
    story += [image, Paragraph(caption, styles["ManualCaption"])]
    if index != len(shots) - 1:
        story.append(PageBreak())

story += [
    PageBreak(),
    Paragraph("Controls and signal path", styles["ManualH1"]),
    Paragraph("Normal slider dragging is fine-grained. Hold Ctrl while dragging for meaningful coarse snapping. Gray controls are inactive in the current mode. Matrix-modulated destinations show base -> effective while their value changes.", styles["ManualBody"]),
    Paragraph("The fixed path is source analysis -> threshold/gain -> PM or scan-integrated FM -> carrier rendering -> color/output. Setup moves Dropout and Feedback between defined connection points. Phosphor persistence is display-only and never feeds the signal loop.", styles["ManualBody"]),
    Paragraph("Complete parameter reference", styles["ManualH1"]),
]

current_group = None
rows = parameter_rows()
for group, label, parameter_id, value_range, default, description in rows:
    if group != current_group:
        if current_group is not None:
            story.append(PageBreak())
        story.append(Paragraph(group, styles["ManualH2"]))
        current_group = group
    story.append(card(label, parameter_id, value_range, default, description))

story += [
    PageBreak(),
    Paragraph("Operational details", styles["ManualH1"]),
    Paragraph("Presets", styles["ManualH2"]),
    Paragraph("Preset JSON stores all 82 effect parameters, but no source files, imported samples, monitor state, playback position, Debug View, retrigger origin, or temporal buffers. Loading a preset resets temporal history and retriggers Transport LFOs.", styles["ManualBody"]),
    Paragraph("LFO timing", styles["ManualH2"]),
    Paragraph("Timeline sync uses absolute host time. Transport sync uses a session retrigger origin. In 4/4, 1/4 is one cycle per beat, 1/8 is two cycles per beat, and 1 bar is one cycle per four beats.", styles["ManualBody"]),
    Paragraph("Current OFX limits", styles["ManualH2"]),
    Paragraph("Audio carrier/analysis, imported custom wavetable payloads, temporal feedback history, and phosphor history are explicit parity gates in OFX 0.1.0. The Companion session disables unsupported choices where possible; shared Resolve enum and matrix controls may still expose combinations that the native renderer rejects instead of approximating. Time Jitter changes internal signal time and is not source-video time remapping.", styles["ManualBody"]),
]

if len(rows) != 82:
    raise RuntimeError(f"Expected 82 parameter rows, found {len(rows)}")

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc.build(story)
print(f"Created {OUTPUT} with {len(rows)} documented parameters")
