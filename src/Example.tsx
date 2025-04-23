import React, { useState } from "react";
import PdfTextSelector from "./PdfTextSelector";

const Example = () => {
  const pdfUrl ="/invoicesample.pdf";
  const [selectedField, setSelectedField] = useState("box1");
  const [box1, setBox1] = useState("");
  const [box2, setBox2] = useState("");
  const [dividerPosition, setDividerPosition] = useState(50); 

  const handleSelectedText = (text: string) => {
    if (selectedField === "box1") {
      setBox1(text);
    } else if (selectedField === "box2") {
      setBox2(text);
    }
  };

  const textareaStyle = (active: boolean) => ({
    padding: "0.75rem",
    width: "100%",
    borderRadius: "6px",
    border: `2px solid ${active ? "#3B82F6" : "#ccc"}`,
    resize: "none",
    outline: "none",
  } as React.CSSProperties);

  // Handle resizing
  const handleMouseDown = (e: { preventDefault: () => void; clientX: number; }) => {
    e.preventDefault();

    const startX = e.clientX;
    const startWidth = dividerPosition;

    const onMouseMove = (moveEvent: { clientX: number; }) => {
      const newWidth = startWidth + ((moveEvent.clientX - startX) / window.innerWidth) * 100;
      setDividerPosition(Math.min(Math.max(newWidth, 10), 90)); 
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* PDF Viewer */}
      <div
        style={{
          width: `${dividerPosition}%`,
          display: "flex",
          flexDirection: "column",
          padding:"10px"
        }}
      >
        <PdfTextSelector
          pdfUrl={pdfUrl}
          selectedTextBox={handleSelectedText}
          fieldTextMap={{
            box1,
            box2,
          }}
          fieldColorMap={{
            box1: "rgba(255, 255, 0, 0.5)",
            box2: "rgba(255, 0, 0, 0.5)",
          }}
        />
      </div>

      {/* Resizable Divider */}
      <div
        style={{
          width: "10px",
          backgroundColor: "#ccc",
          cursor: "ew-resize",
          height: "100vh",
        }}
        onMouseDown={handleMouseDown}
      />

      {/* Text Fields */}
      <div
        style={{
          width: `${100 - dividerPosition}%`,
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <h2>Selected Text Fields</h2>

        <textarea
          placeholder="Field 1 (click to activate)"
          value={box1}
          onFocus={() => setSelectedField("box1")}
          onChange={(e) => setBox1(e.target.value)}
          style={textareaStyle(selectedField === "box1")}
        />

        <textarea
          placeholder="Field 2 (click to activate)"
          value={box2}
          onFocus={() => setSelectedField("box2")}
          onChange={(e) => setBox2(e.target.value)}
          style={textareaStyle(selectedField === "box2")}
        />
      </div>
    </div>
  );
};

export default Example;
