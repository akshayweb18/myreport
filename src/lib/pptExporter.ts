import PptxGenJS from "pptxgenjs";
import type { ReportDraft, PhotoMetadata, SlideConfig } from "@/types";
import { LAYOUT_CONFIGS } from "@/types";
import { getPhoto } from "@/lib/db";
import { blobToBase64 } from "./imageUtils";

const SLIDE_W_LANDSCAPE = 13.33; // inches
const SLIDE_H_LANDSCAPE = 7.5;
const SLIDE_W_PORTRAIT = 7.5;
const SLIDE_H_PORTRAIT = 10;
const MARGIN = 0.3;
const HEADER_H = 0.6;
const FOOTER_H = 0.35;
const CAPTION_H = 0.45;

/**
 * Main PPT generation engine.
 * Builds a professional PPTX with headers, footers, logos, slide numbers,
 * and configurable grid layouts.
 */
export async function generatePPTX(
  draft: ReportDraft,
  photosMap: Map<string, PhotoMetadata>
): Promise<void> {
  const pptx = new PptxGenJS();

  const isLandscape = draft.orientation === "landscape";
  const slideW = isLandscape ? SLIDE_W_LANDSCAPE : SLIDE_W_PORTRAIT;
  const slideH = isLandscape ? SLIDE_H_LANDSCAPE : SLIDE_H_PORTRAIT;

  pptx.layout = isLandscape ? "LAYOUT_WIDE" : "LAYOUT_4x3";
  pptx.author = draft.info.inspectorName;
  pptx.company = draft.info.projectName;
  pptx.subject = draft.info.reportName;
  pptx.title = draft.info.reportName;

  const totalSlides = draft.slides.length;

  for (let slideIndex = 0; slideIndex < draft.slides.length; slideIndex++) {
    const slideConfig = draft.slides[slideIndex];
    const slide = pptx.addSlide();

    // ── Background
    slide.background = { color: "FFFFFF" };

    // ── Header bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: slideW, h: HEADER_H,
      fill: { color: "1E3A5F" },
      line: { color: "1E3A5F" },
    });

    // Report title in header
    slide.addText(draft.info.reportName || "Field Report", {
      x: MARGIN, y: 0, w: slideW * 0.55, h: HEADER_H,
      fontSize: 11, bold: true, color: "FFFFFF",
      valign: "middle",
    });

    // Project info in header (right side)
    slide.addText(
      `${draft.info.projectName || ""} | ${draft.info.reportDate || ""}`,
      {
        x: slideW * 0.55, y: 0, w: slideW * 0.45 - MARGIN, h: HEADER_H,
        fontSize: 8, color: "CCDDEE", align: "right", valign: "middle",
      }
    );

    // ── Footer bar
    const footerY = slideH - FOOTER_H;
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: footerY, w: slideW, h: FOOTER_H,
      fill: { color: "F0F4F8" },
      line: { color: "D0D8E0" },
    });

    // Inspector
    slide.addText(`Inspector: ${draft.info.inspectorName || "-"}`, {
      x: MARGIN, y: footerY, w: slideW * 0.4, h: FOOTER_H,
      fontSize: 7, color: "555555", valign: "middle",
    });

    // Client
    slide.addText(`Client: ${draft.info.clientName || "-"}`, {
      x: slideW * 0.4, y: footerY, w: slideW * 0.3, h: FOOTER_H,
      fontSize: 7, color: "555555", align: "center", valign: "middle",
    });

    // Slide number
    slide.addText(`${slideIndex + 1} / ${totalSlides}`, {
      x: slideW - 1.2 - MARGIN, y: footerY, w: 1.2, h: FOOTER_H,
      fontSize: 7, color: "555555", align: "right", valign: "middle",
    });

    // ── Photo grid
    const contentY = HEADER_H + 0.15;
    const contentH = footerY - contentY - 0.1;
    const contentW = slideW - MARGIN * 2;

    const { rows, cols } = getGridDimensions(slideConfig);
    const cellW = contentW / cols;
    const imgH = (contentH - CAPTION_H * rows - 0.1 * (rows - 1)) / rows;

    for (let i = 0; i < slideConfig.photoIds.length; i++) {
      const photoId = slideConfig.photoIds[i];
      const photo = photosMap.get(photoId);
      if (!photo) continue;

      const col = i % cols;
      const row = Math.floor(i / cols);

      const imgX = MARGIN + col * cellW + 0.05;
      const imgY = contentY + row * (imgH + CAPTION_H + 0.1) + 0.05;
      const imgW = cellW - 0.1;

      // Get image data
      try {
        const record = await getPhoto(photoId);
        let imgData: string | undefined;

        if (record?.imageBlob) {
          imgData = await blobToBase64(record.imageBlob);
        } else if (photo.imageUrl) {
          imgData = photo.imageUrl;
        }

        if (imgData) {
          slide.addImage({
            data: imgData.startsWith("data:") ? imgData : undefined,
            path: !imgData.startsWith("data:") ? imgData : undefined,
            x: imgX, y: imgY,
            sizing: { type: "contain", w: imgW, h: imgH },
          });
        }
      } catch {
        // Show placeholder on error
        slide.addShape(pptx.ShapeType.rect, {
          x: imgX, y: imgY, w: imgW, h: imgH,
          fill: { color: "EEEEEE" },
        });
      }

      // Title caption
      if (photo.title) {
        slide.addText(photo.title, {
          x: imgX, y: imgY + imgH + 0.02, w: imgW, h: 0.22,
          fontSize: 7, bold: true, color: "1E3A5F",
          align: "center", valign: "top",
        });
      }

      // Comment caption
      if (photo.comment) {
        slide.addText(photo.comment, {
          x: imgX, y: imgY + imgH + 0.22, w: imgW, h: 0.2,
          fontSize: 6, color: "555555",
          align: "center", valign: "top",
        });
      }
    }

    // ── Slide notes
    if (slideConfig.notes) {
      slide.addNotes(slideConfig.notes);
    }
  }

  // Save/download
  await pptx.writeFile({
    fileName: `${draft.info.reportName || "Report"}_${new Date().toISOString().slice(0, 10)}.pptx`,
  });
}

function getGridDimensions(slide: SlideConfig): { rows: number; cols: number } {
  if (slide.layout === "custom" && slide.customRows && slide.customCols) {
    return { rows: slide.customRows, cols: slide.customCols };
  }
  const config = LAYOUT_CONFIGS.find((c) => c.type === slide.layout);
  if (config) return { rows: config.rows, cols: config.cols };
  return { rows: 2, cols: 3 };
}
