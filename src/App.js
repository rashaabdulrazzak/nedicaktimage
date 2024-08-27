import React, { useEffect, useRef } from "react";
import cornerstone from "cornerstone-core";
import * as cornerstoneTools from "cornerstone-tools";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import dicomParser from "dicom-parser";
import "./App.css";

cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

const App = () => {
  const divRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null); // Ref to the hidden input

  const applyMaskToImage = (pixelData, mask) => {
    const maskedData = new Uint8ClampedArray(pixelData.length); // RGBA data
    const totalPixels = pixelData.length / 4;

    for (let i = 0; i < totalPixels; i++) {
      const maskValue = mask[i]; // Assumed to be 0 or 1
      const pixelIndex = i * 4; // RGBA index

      if (maskValue === 1) {
        // Apply yellow color for mask
        maskedData[pixelIndex] = 255; // Red
        maskedData[pixelIndex + 1] = 255; // Green
        maskedData[pixelIndex + 2] = 0; // Blue
        maskedData[pixelIndex + 3] = 128; // Alpha (transparency)
      } else {
        // Copy original pixel data
        maskedData[pixelIndex] = pixelData[pixelIndex];
        maskedData[pixelIndex + 1] = pixelData[pixelIndex + 1];
        maskedData[pixelIndex + 2] = pixelData[pixelIndex + 2];
        maskedData[pixelIndex + 3] = pixelData[pixelIndex + 3];
      }
    }

    return maskedData;
  };

  function decodeRLEMask(rle, width, height) {
    const mask = new Uint8Array(width * height).fill(0);
    const rleArray = rle.trim().split(/\s+/).map(Number);

    for (let i = 0; i < rleArray.length; i += 2) {
      const start = rleArray[i] - 1; // Adjust to zero-based index
      const length = rleArray[i + 1];
      if (start >= 0 && start < width * height) {
        const end = Math.min(start + length, width * height);
        for (let j = start; j < end; j++) {
          mask[j] = 1;
        }
      }
    }

    return mask;
  }

  const loadDicomImage = async (file) => {
    try {
      const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file);
      const image = await cornerstone.loadImage(imageId);
      const element = divRef.current;
      cornerstone.displayImage(element, image);

      const canvas = canvasRef.current;
      canvas.width = image.width;
      canvas.height = image.height;

      return {
        width: image.width,
        height: image.height,
        pixelData: image.getPixelData(),
      };
    } catch (error) {
      console.error("Error loading DICOM image:", error);
    }
  };

  const drawImageWithMask = (maskedData, width, height) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;

    const imageData = context.createImageData(width, height);
    imageData.data.set(maskedData);
    context.putImageData(imageData, 0, 0);
    context.fillStyle = "rgba(255, 255, 0, 0.5)";
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const { width, height, pixelData } = await loadDicomImage(file);
      const canvas = canvasRef.current;
      canvas.width = width;
      canvas.height = height;

      const rleMask =
        "324033 38 325215 44 326397 50 327580 53 328764 55 329948 56 331130 62 332314 64 333497 69 334679 74 335862 77 337046 78 338230 80 339415 80 340599 82 341784 83 342968 84 344152 86 345336 88 346521 88 347705 90 348890 90 350075 90 351259 92 352444 92 353629 93 354814 93 355999 93 357184 93 358368 94 359553 94 360737 95 361922 95 363107 95 364292 95 365477 95 366662 95 367847 95 369032 95 370217 95 371402 95 372587 95 373772 95 374957 95 376142 95 377327 94 378513 93 379698 92 380884 91 382069 90 383254 90 384440 88 385625 87 386811 86 387997 84 389182 84 390368 82 391553 82 392739 80 393927 77 395114 74 396300 72 397487 69 398673 66 399861 62 401049 57 402237 51 403425 47 404614 40 405800 38 406988 34 408174 31 409362 25";
      const mask = decodeRLEMask(rleMask, width, height);
      const maskedData = applyMaskToImage(pixelData, mask);
      drawImageWithMask(maskedData, width, height);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current.click();
  };

  useEffect(() => {
    const element = divRef.current;
    cornerstone.enable(element);
    cornerstoneTools.init();
    const toolName = "EllipticalRoi";
    const EllipticalRoiTool = cornerstoneTools[`${toolName}Tool`];
    cornerstoneTools.addTool(EllipticalRoiTool);
    cornerstoneTools.setToolActive("EllipticalRoi", { mouseButtonMask: 1 });

    return () => {
      cornerstone.disable(element);
    };
  }, []);

  return (
    <div className="App">
      <button onClick={triggerFileUpload} className="btn">
        Upload Image
      </button>

      {/* Hidden input to trigger file dialog */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />

      <div
        ref={divRef}
        style={{
          position: "relative",
          width: "512px",
          height: "512px",
          border: "1px solid #000",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        ></canvas>
      </div>
    </div>
  );
};

export default App;
