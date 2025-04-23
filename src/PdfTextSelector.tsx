import React, { JSX, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PdfTextSelectorProps {
  pdfUrl: string;
  workerSrc?: string;
  selectedTextBox?: (text: string) => void;
  showSelectionControls?: boolean;
  fieldTextMap?: Record<string, string>;
  fieldColorMap?: Record<string, string>;
}

type Selection = {
  startX: number;
  startY: number;
  endX?: number;
  endY?: number;
};

const PdfTextSelector: React.FC<PdfTextSelectorProps> = ({
  pdfUrl,
  selectedTextBox = () => {},
  showSelectionControls = true,
  fieldTextMap = {},
  fieldColorMap = {},
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [dragging, setDragging] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [highlighting, setHighlighting] = useState(true); 
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.body.style.userSelect = dragging ? "none" : "auto";
    return () => {
      document.body.style.userSelect = "auto";
    };
  }, [dragging]);

  const togglePanMode = () => {
    setPanMode((prev) => {
      if (!prev) setSelectMode(false);
      return !prev;
    });
  };

  const toggleSelectMode = () => {
    setSelectMode((prev) => {
      if (!prev) setPanMode(false);
      return !prev;
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pdfContainerRef.current || (!selectMode && !panMode)) return;
  
    const rect = pdfContainerRef.current.getBoundingClientRect();
    const scrollTop = pdfContainerRef.current.scrollTop;
    const scrollLeft = pdfContainerRef.current.scrollLeft;
    setDragging(true);
  
    if (selectMode) {
      setSelection({
        startX: e.clientX - rect.left + scrollLeft,
        startY: e.clientY - rect.top + scrollTop,
        endX: e.clientX - rect.left + scrollLeft,
        endY: e.clientY - rect.top + scrollTop,
      });
    } else if (panMode) {
      setSelection({
        startX: e.clientX,
        startY: e.clientY,
      });
    }
  };
  

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging || !pdfContainerRef.current) return;
  
    const rect = pdfContainerRef.current.getBoundingClientRect();
    const scrollTop = pdfContainerRef.current.scrollTop;
    const scrollLeft = pdfContainerRef.current.scrollLeft;
  
    if (selectMode && selection) {
      setSelection((prev) =>
        prev
          ? {
              ...prev,
              endX: e.clientX - rect.left + scrollLeft,
              endY: e.clientY - rect.top + scrollTop,
            }
          : null
      );
    } else if (panMode && selection) {
      const dx = e.clientX - selection.startX;
      const dy = e.clientY - selection.startY;
  
      pdfContainerRef.current.scrollLeft -= dx;
      pdfContainerRef.current.scrollTop -= dy;
  
      setSelection({
        startX: e.clientX,
        startY: e.clientY,
      });
    }
  };
  

  const handleMouseUp = () => {
    if (!pdfContainerRef.current) return;
    setDragging(false);
  
    if (selectMode && selection) {
      const box = {
        left: Math.min(selection.startX, selection.endX ?? selection.startX) / scale,
        top: Math.min(selection.startY, selection.endY ?? selection.startY) / scale,
        right: Math.max(selection.startX, selection.endX ?? selection.startX) / scale,
        bottom: Math.max(selection.startY, selection.endY ?? selection.startY) / scale,
      };
  
      const containerRect = pdfContainerRef.current.getBoundingClientRect();
      const scrollTop = pdfContainerRef.current.scrollTop;
      const scrollLeft = pdfContainerRef.current.scrollLeft;
  
      const textLayers = pdfContainerRef.current.querySelectorAll(".textLayer");
      const selectedText: string[] = [];
  
      textLayers.forEach((layer) => {
        const spans = layer.querySelectorAll("span");
        spans.forEach((span) => {
          const rect = span.getBoundingClientRect();
          const text = span.textContent || "";
  
          for (let i = 0; i < text.length; i++) {
            const charWidth = (rect.right - rect.left) / text.length;
            const charLeft = rect.left + i * charWidth;
            const charRight = charLeft + charWidth;
  
            const charRect = {
              left: (charLeft - containerRect.left + scrollLeft) / scale,
              right: (charRight - containerRect.left + scrollLeft) / scale,
              top: (rect.top - containerRect.top + scrollTop) / scale,
              bottom: (rect.bottom - containerRect.top + scrollTop) / scale,
            };
  
            const overlaps =
              charRect.left < box.right &&
              charRect.right > box.left &&
              charRect.top < box.bottom &&
              charRect.bottom > box.top;
  
            if (overlaps) {
              selectedText.push(text[i]);
            }
          }
        });
      });
  
      const joined = selectedText.join("");
      selectedTextBox(joined); 
    }
  
    setSelection(null);
  };

  useEffect(() => {
    const highlightMatches = () => {
      const textLayers = pdfContainerRef.current?.querySelectorAll(".textLayer") ?? [];
  
      textLayers.forEach((layer) => {
        const spans = Array.from(layer.querySelectorAll("span")) as HTMLSpanElement[];
  
        // Clear previous highlights
        spans.forEach((span) => {
          span.style.backgroundColor = "";
          span.style.borderRadius = "";
          span.style.marginTop = "";
          span.style.paddingBottom = "";
          span.style.marginLeft = "";
          span.style.paddingRight = "";
        });
  
        if (!highlighting) return;
  
        const allText = spans.map((s) => s.textContent ?? "").join("");
        const indicesToHighlight: { start: number; end: number; color: string }[] = [];
  
        Object.entries(fieldTextMap).forEach(([key, value]) => {
          if (!value) return;
  
          const color = fieldColorMap[key] ?? "rgba(255, 255, 0, 0.5)";
          let startIndex = 0;
  
          while ((startIndex = allText.indexOf(value, startIndex)) !== -1) {
            indicesToHighlight.push({
              start: startIndex,
              end: startIndex + value.length,
              color,
            });
            startIndex += value.length;
          }
        });
  
        const charMap: { span: HTMLSpanElement; index: number }[] = [];
        spans.forEach((span) => {
          const text = span.textContent ?? "";
          for (let i = 0; i < text.length; i++) {
            charMap.push({ span, index: i });
          }
        });
  
        indicesToHighlight.forEach(({ start, end, color }) => {
          for (let i = start; i < end; i++) {
            const charEntry = charMap[i];
            if (charEntry) {
              Object.assign(charEntry.span.style, {
                backgroundColor: color,
                borderRadius: "4px",
                marginTop: "-4px",
                paddingBottom: "6px",
                marginLeft: "-4px",
                paddingRight: "8px",
              });
            }
          }
        });
      });
    };
  
    // Timeout to allow layout to settle before highlighting
    const timeout = setTimeout(highlightMatches, 300);
  
    return () => clearTimeout(timeout); 
  }, [fieldTextMap, fieldColorMap, currentPage, scale, highlighting]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };


  const renderSelectionBox = (): JSX.Element | null => {
    if (!selection || !selectMode || selection.endX === undefined || selection.endY === undefined) {
      return null;
    }
  
    const style: React.CSSProperties = {
      position: "absolute",
      border: "2px dashed blue",
      backgroundColor: "rgba(0, 0, 255, 0.1)",
      left: Math.min(selection.startX, selection.endX),
      top: Math.min(selection.startY, selection.endY),
      width: Math.abs(selection.endX - selection.startX),
      height: Math.abs(selection.endY - selection.startY),
      pointerEvents: "none",
    };
  
    return <div style={style} />;
  };
  

  const buttonStyle = (active = false, disabled = false) => ({
    padding: "0.5rem",
    backgroundColor: disabled ? "#F3F4F6" : active ? "#2563EB" : "#E5E7EB",
    color: disabled ? "#9CA3AF" : active ? "white" : "black",
    border: "none",
    borderRadius: "0.375rem",
    cursor: disabled ? "not-allowed" : "pointer",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: "600" }}>Control Panel</h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {showSelectionControls && (
          <button onClick={toggleSelectMode} style={buttonStyle(selectMode)}>
            {selectMode ? "Selection Mode On" : "Enable Selection"}
          </button>
        )}
        <button onClick={togglePanMode} style={buttonStyle(panMode)}>
          {panMode ? "Pan Mode On" : "Enable Pan"}
        </button>
        <button onClick={() => setScale((s) => Math.min(s + 0.25, 4))} style={buttonStyle()}>
          Zoom In
        </button>
        <button onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))} style={buttonStyle()}>
          Zoom Out
        </button>
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage <= 1}
          style={buttonStyle(false, currentPage <= 1)}
        >
          Previous Page
        </button>
        <button
          onClick={() => setCurrentPage((p) => Math.min(p + 1, numPages ?? p))}
          disabled={currentPage >= (numPages ?? 0)}
          style={buttonStyle(false, currentPage >= (numPages ?? 0))}
        >
          Next Page
        </button>
        {/* Highlighting toggle button */}
        <button onClick={() => setHighlighting((prev) => !prev)} style={buttonStyle(highlighting)}>
          {highlighting ? "Highlighting On" : "Highlighting Off"}
        </button>
      </div>

      <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#6B7280" }}>
        Page {currentPage} of {numPages}
      </p>

      <div
        ref={pdfContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          flex: 1,
          overflow: "auto",
          backgroundColor: "#F7FAFC",
          padding: "1rem",
          position: "relative",
        }}
      >
      <Document
        file={pdfUrl}
        onLoadSuccess={(doc) => {
          console.log("PDF loaded successfully!");
          onDocumentLoadSuccess(doc);
        }}
        onLoadError={(error) => {
          console.error("❌ Failed to load PDF:", error);
          alert("Failed to load PDF: " + error.message);
        }}
        loading={<p>Loading PDF...</p>}
        noData={<p>No PDF file specified</p>}
      >
        <Page
          key={`page_${currentPage}`}
          pageNumber={currentPage}
          scale={scale}
          renderTextLayer={true}
          renderAnnotationLayer={false}
          onRenderError={(error) => {
            console.error("❌ Failed to render page:", error);
          }}
        />
      </Document>
        {renderSelectionBox()}
      </div>
    </div>
  );
};

export default PdfTextSelector;
