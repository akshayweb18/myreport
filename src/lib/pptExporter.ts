import PptxGenJS from "pptxgenjs";
import type { ReportDraft, PhotoMetadata, SlideConfig } from "@/types";
import { LAYOUT_CONFIGS } from "@/types";
import { getPhoto } from "@/lib/db";

// ─── A4 portrait slide dimensions (inches) ───────────────────────────────────
const SLIDE_W = 7.5;
const SLIDE_H = 10.0;
const MARGIN_X   = 0.35;
const MARGIN_TOP = 0.50;
const HEADER_H   = 0.45;
const FOOTER_H   = 0.42;
const GAP_X      = 0.18;
const GAP_Y      = 0.20;
const SERIAL_H   = 0.22;
const IMG_RATIO  = 0.68;
const INNER_PAD  = 0.07;

const CLR_WHITE      = "FFFFFF";
const CLR_BLACK      = "000000";
const CLR_BORDER     = "CCCCCC";
const CLR_HEADER_BG  = "F5F5F5";
const CLR_SERIAL     = "444444";
const CLR_TITLE      = "111111";
const CLR_DATE       = "555555";
const CLR_REMARK     = "333333";
const CLR_FOOTER_BG  = "F2F2F2";
const CLR_FOOTER_TXT = "888888";
const CLR_DIVIDER    = "DDDDDD";

interface PngResult { dataUrl: string; naturalWidth: number; naturalHeight: number; }

/**
 * Re-renders any blob through canvas → clean sRGB JPEG.
 * Uses JPEG (not PNG) to keep file sizes small so the download never hangs.
 * MAX cap at 1280px prevents memory exhaustion on large horizontal photos.
 */
function blobToCanvasPng(blob: Blob): Promise<PngResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const MAX = 1280;   // JPEG is already lossy, 1280px is plenty for PPT
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round((h * MAX) / w); w = MAX; }
        else        { w = Math.round((w * MAX) / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("No canvas ctx")); return; }
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      // JPEG keeps file small; PowerPoint handles it fine
      resolve({ dataUrl: canvas.toDataURL("image/jpeg", 0.88), naturalWidth: w, naturalHeight: h });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}


function containFit(cellW: number, cellH: number, natW: number, natH: number) {
  const imgAR  = natW / natH;
  const cellAR = cellW / cellH;
  let w: number, h: number;
  if (imgAR >= cellAR) { w = cellW; h = cellW / imgAR; }
  else                  { h = cellH; w = cellH * imgAR; }
  return { w, h, dx: (cellW - w) / 2, dy: (cellH - h) / 2 };
}

function getGridDimensions(sc: SlideConfig): { rows: number; cols: number } {
  if (sc.layout === "custom" && sc.customRows && sc.customCols)
    return { rows: sc.customRows, cols: sc.customCols };
  const cfg = LAYOUT_CONFIGS.find(c => c.type === sc.layout);
  return cfg ? { rows: cfg.rows, cols: cfg.cols } : { rows: 2, cols: 2 };
}

function fmtDate(ts: number | string | undefined): string {
  if (!ts) return "";
  const d = new Date(typeof ts === "number" ? ts : Date.parse(ts as string));
  if (isNaN(d.getTime())) return String(ts);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric", year: "numeric" });
}

export async function generatePPTX(
  draft: ReportDraft,
  photosMap: Map<string, PhotoMetadata>
): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "A4_PORTRAIT", width: SLIDE_W, height: SLIDE_H });
  pptx.layout  = "A4_PORTRAIT";
  pptx.author  = draft.info.inspectorName || "";
  pptx.company = draft.info.projectName   || "";
  pptx.subject = draft.info.reportName    || "";
  pptx.title   = draft.info.reportName    || "";

  const totalSlides = draft.slides.length;
  let globalSerial  = 0;

  for (let si = 0; si < draft.slides.length; si++) {
    const slideConfig = draft.slides[si];
    const { rows, cols } = getGridDimensions(slideConfig);
    const slide = pptx.addSlide();
    slide.background = { color: CLR_WHITE };

    // ── Header strip ─────────────────────────────────────────────────────────
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: SLIDE_W, h: HEADER_H,
      fill: { color: CLR_HEADER_BG },
      line: { color: CLR_DIVIDER, width: 0.5 },
    });
    const headerText: PptxGenJS.TextProps[] = [
      { text: "Title: ",     options: { bold: true,  color: CLR_BLACK } },
      { text: (draft.info.reportName || "-") + "   ", options: { color: CLR_BLACK } },
      { text: "Created: ",   options: { bold: true,  color: CLR_BLACK } },
      { text: (draft.info.reportDate || fmtDate(draft.createdAt)) + "   ", options: { color: CLR_BLACK } },
      { text: "No. Items: ", options: { bold: true,  color: CLR_BLACK } },
      { text: String(slideConfig.photoIds.length), options: { color: CLR_BLACK } },
    ];
    slide.addText(headerText, {
      x: MARGIN_X, y: 0, w: SLIDE_W - MARGIN_X * 2, h: HEADER_H,
      fontSize: 9, valign: "middle", align: "left",
    });

    // ── Card layout calculation ───────────────────────────────────────────────
    const contentW = SLIDE_W - MARGIN_X * 2;
    const contentH = SLIDE_H - HEADER_H - MARGIN_TOP - FOOTER_H - 0.1;
    const cardW    = (contentW - GAP_X * (cols - 1)) / cols;
    const cardH    = (contentH - GAP_Y * (rows - 1)) / rows;
    const imgBoxH  = cardH * IMG_RATIO - SERIAL_H;
    const metaH    = cardH - imgBoxH - SERIAL_H - 0.08;

    // ── Photo cards ──────────────────────────────────────────────────────────
    for (let i = 0; i < slideConfig.photoIds.length; i++) {
      const photoId = slideConfig.photoIds[i];
      const photo   = photosMap.get(photoId);
      globalSerial++;
      if (!photo) continue;

      const col   = i % cols;
      const row   = Math.floor(i / cols);
      const cardX = MARGIN_X + col * (cardW + GAP_X);
      const cardY = HEADER_H + MARGIN_TOP + row * (cardH + GAP_Y);

      // Card outer border
      slide.addShape(pptx.ShapeType.rect, {
        x: cardX, y: cardY, w: cardW, h: cardH,
        fill: { color: CLR_WHITE },
        line: { color: CLR_BORDER, width: 0.75 },
      });

      // Serial number e.g. "(1)"
      slide.addText("(" + String(globalSerial) + ")", {
        x: cardX + 0.06, y: cardY + 0.04,
        w: cardW - 0.12, h: SERIAL_H,
        fontSize: 8, color: CLR_SERIAL, align: "left", valign: "top",
      });

      // Image box (invisible, just for background fill)
      const imgBoxX = cardX + 0.06;
      const imgBoxY = cardY + SERIAL_H + 0.04;
      const imgBoxW = cardW - 0.12;
      slide.addShape(pptx.ShapeType.rect, {
        x: imgBoxX, y: imgBoxY, w: imgBoxW, h: imgBoxH,
        fill: { color: CLR_WHITE },
      });

      // Track actual image bottom to place metadata immediately below it
      let actualImgBottom = imgBoxY + imgBoxH; // default fallback

      try {
        // 1) Try to load from IndexedDB blob (most reliable)
        let png: PngResult | undefined;
        let fallback: string | undefined;

        const record = await getPhoto(photoId);
        if (record?.imageBlob && record.imageBlob.size > 0) {
          png = await blobToCanvasPng(record.imageBlob);
        }

        // 2) Fallback: fetch from object URL (may fail if revoked)
        if (!png && photo.localBlobUrl) {
          try {
            const resp = await fetch(photo.localBlobUrl);
            if (resp.ok) {
              const blob = await resp.blob();
              if (blob.size > 0) png = await blobToCanvasPng(blob);
            }
          } catch {
            // object URL was revoked – fall through to Firebase URL
          }
        }

        // 3) Last resort: Firebase/remote URL
        if (!png && photo.imageUrl) {
          fallback = photo.imageUrl;
        }

        const innerW = imgBoxW - INNER_PAD * 2;
        const innerH = imgBoxH - INNER_PAD * 2;
        const innerX = imgBoxX + INNER_PAD;
        const innerY = imgBoxY + INNER_PAD;

        if (png) {
          const { w, h, dx, dy } = containFit(innerW, innerH, png.naturalWidth, png.naturalHeight);
          slide.addImage({ data: png.dataUrl, x: innerX + dx, y: innerY + dy, w, h });
          // Metadata starts right after the actual rendered image bottom
          actualImgBottom = innerY + dy + h;
        } else if (fallback) {
          slide.addImage({
            path: fallback, x: imgBoxX, y: imgBoxY, w: imgBoxW, h: imgBoxH,
            sizing: { type: "contain", w: imgBoxW, h: imgBoxH },
          });
          // Can't know exact fit bottom for remote URL, use imgBox bottom
          actualImgBottom = imgBoxY + imgBoxH;
        }
      } catch {
        slide.addText("Image unavailable", {
          x: imgBoxX, y: imgBoxY, w: imgBoxW, h: imgBoxH,
          fontSize: 8, color: "999999", align: "center", valign: "middle",
        });
      }

      // ── Metadata directly below actual image bottom (no wasted gap) ──────
      const metaX     = cardX + 0.08;
      const metaW     = cardW - 0.16;
      const metaStart = actualImgBottom + 0.06;  // small gap after actual image
      const lineH     = 0.17;

      if (photo.title) {
        slide.addText(photo.title, {
          x: metaX, y: metaStart, w: metaW, h: lineH + 0.04,
          fontSize: 9, bold: true, color: CLR_TITLE,
          align: "left", valign: "top", wrap: false,
        });
      }

      const createdParts: PptxGenJS.TextProps[] = [
        { text: "Created:  ", options: { bold: true, color: CLR_DATE } },
        { text: fmtDate(photo.createdAt), options: { bold: false, color: CLR_DATE } },
      ];
      slide.addText(createdParts, {
        x: metaX, y: metaStart + lineH + 0.04, w: metaW, h: lineH,
        fontSize: 8, align: "left", valign: "top",
      });

      if (photo.comment) {
        // Calculate remaining height to the bottom of the card, minus some padding
        const commentStartY = metaStart + (lineH + 0.04) * 2;
        const remainingH = (cardY + cardH) - commentStartY - 0.04; // 0.04 inch bottom padding
        
        slide.addText(photo.comment, {
          x: metaX, y: commentStartY,
          w: metaW, h: Math.max(remainingH, lineH * 2), // Ensure at least 2 lines of height
          fontSize: 8, color: CLR_REMARK, align: "left", valign: "top", wrap: true,
        });
      }
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = SLIDE_H - FOOTER_H;
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: footerY, w: SLIDE_W, h: FOOTER_H,
      fill: { color: CLR_FOOTER_BG },
      line: { color: CLR_DIVIDER, width: 0.5 },
    });
    slide.addText("Generated by MyReport", {
      x: MARGIN_X, y: footerY, w: SLIDE_W / 2, h: FOOTER_H,
      fontSize: 7, color: CLR_FOOTER_TXT, align: "left", valign: "middle",
    });
    slide.addText("page " + String(si + 1) + " of " + String(totalSlides), {
      x: SLIDE_W / 2, y: footerY, w: SLIDE_W / 2 - MARGIN_X, h: FOOTER_H,
      fontSize: 7, color: CLR_FOOTER_TXT, align: "right", valign: "middle",
    });

    if (slideConfig.notes) slide.addNotes(slideConfig.notes);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  await pptx.writeFile({ fileName: (draft.info.reportName || "Report") + "_" + ts + ".pptx" });
}
