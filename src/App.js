import React, { useState, useRef } from "react";
import QRCode from "qrcode.react";
import "./App.css";

// Cloudinary configuration from env
const CLOUDINARY_CLOUD_NAME = "dqjz4xwfg";
// Using unsigned upload preset - you need to create this in your Cloudinary dashboard
const CLOUDINARY_UPLOAD_PRESET = "delivery_images";

// UUID v4 generation function
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function App() {
  const [formData, setFormData] = useState({
    phonenumber: "",
    couriername: "",
    imageurl: "",
    numberofpackages: "",
    note: "",
    deliveryId: uuidv4(), // Generate a UUID when form is initialized
  });

  const [showQR, setShowQR] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear messages when user starts typing
    setError("");
    setSuccess("");
  };

  const handleImageUpload = async (file) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    setError("");

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: uploadFormData,
        }
      );

      const data = await response.json();
      if (data.secure_url) {
        setFormData((prev) => ({
          ...prev,
          imageurl: data.secure_url,
        }));
        setImagePreview(data.secure_url);
        setSuccess("Image uploaded successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      setError("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const startCamera = async () => {
    try {
      setCameraError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setShowCamera(true);
      setError("");
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera access denied. Please check your browser settings and allow camera access."
          : "Failed to access camera. Please make sure your device has a working camera."
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setShowCamera(false);
    setCameraError("");
  };

  const capturePhoto = async () => {
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.8)
      );
      const file = new File([blob], "camera-photo.jpg", { type: "image/jpeg" });

      stopCamera();
      handleImageUpload(file);
    } catch (err) {
      setError("Failed to capture photo. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form processing
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (
      !formData.phonenumber ||
      !formData.couriername ||
      !formData.numberofpackages
    ) {
      setError("Please fill in all required fields");
      setIsSubmitting(false);
      return;
    }

    if (!formData.imageurl && !imagePreview) {
      setError("Please upload a package photo");
      setIsSubmitting(false);
      return;
    }

    setShowQR(true);
    setError("");
    setIsSubmitting(false);
  };

  const resetForm = () => {
    setFormData({
      phonenumber: "",
      couriername: "",
      imageurl: "",
      numberofpackages: "",
      note: "",
      deliveryId: uuidv4(), // Generate a new UUID
    });
    setShowQR(false);
    setImagePreview("");
    setError("");
    setSuccess("");
    stopCamera();
  };

  if (showQR) {
    return (
      <div className="qr-page">
        <div className="qr-container">
          <div className="qr-header">
            <div className="success-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2>QR Code Generated!</h2>
            <p>Scan this code to access delivery information</p>
          </div>

          <div className="qr-code-wrapper">
            <QRCode
              value={JSON.stringify(formData)}
              size={200}
              level="H"
              includeMargin={true}
              fgColor="#1a1a1a"
              bgColor="#ffffff"
            />
          </div>

          <div className="delivery-summary">
            <h3>Delivery Summary</h3>
            <div className="summary-item">
              <span>Courier:</span>
              <span>{formData.couriername}</span>
            </div>
            <div className="summary-item">
              <span>Packages:</span>
              <span>{formData.numberofpackages}</span>
            </div>
            <div className="summary-item">
              <span>Phone:</span>
              <span>{formData.phonenumber}</span>
            </div>
          </div>

          <button
            className="btn new-qr-btn"
            onClick={resetForm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="spinner" />
                Please wait...
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Create New QR Code
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <div className="header-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
              <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
              <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
            </svg>
          </div>
          <h1>Delivery QR Generator</h1>
          <p>Create QR codes for package deliveries</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="couriername">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Courier Name *
              </label>
              <input
                type="text"
                id="couriername"
                name="couriername"
                value={formData.couriername}
                onChange={handleInputChange}
                placeholder="Enter courier name"
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phonenumber">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                Phone Number *
              </label>
              <input
                type="tel"
                id="phonenumber"
                name="phonenumber"
                value={formData.phonenumber}
                onChange={handleInputChange}
                placeholder="Enter phone number"
                className="input-field"
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              Package Photo *
            </label>

            <div className="photo-upload-section">
              {!imagePreview && !showCamera && (
                <div className="upload-options">
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    className="upload-option"
                    disabled={isUploading}
                  >
                    <div className="upload-icon">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                    </div>
                    <div>
                      <h4>{isUploading ? "Uploading..." : "Upload Photo"}</h4>
                      <p>Choose from device</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={startCamera}
                    className="upload-option"
                    disabled={isUploading}
                  >
                    <div className="upload-icon">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                        <circle cx="12" cy="13" r="4"></circle>
                      </svg>
                    </div>
                    <div>
                      <h4>Take Photo</h4>
                      <p>Use camera</p>
                    </div>
                  </button>
                </div>
              )}

              {cameraError && (
                <div className="alert alert-error">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                  {cameraError}
                </div>
              )}

              {showCamera && (
                <div className="camera-container">
                  <div className="camera-viewfinder">
                    <video ref={videoRef} autoPlay playsInline />
                    <div className="camera-overlay">
                      <div className="camera-frame"></div>
                    </div>
                  </div>
                  <div className="camera-controls">
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="btn btn-primary capture-btn"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
                      </svg>
                      Capture
                    </button>
                  </div>
                </div>
              )}

              {imagePreview && (
                <div className="image-preview">
                  <div className="preview-container">
                    <img src={imagePreview} alt="Package preview" />
                    <div className="preview-overlay">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, imageurl: "" }));
                          setImagePreview("");
                        }}
                        className="change-photo-btn"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                        Change Photo
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="numberofpackages">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
              Number of Packages *
            </label>
            <input
              type="number"
              id="numberofpackages"
              name="numberofpackages"
              value={formData.numberofpackages}
              onChange={handleInputChange}
              placeholder="Enter number of packages"
              min="1"
              className="input-field"
            />
          </div>

          <div className="form-group">
            <label htmlFor="note">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Additional Notes
            </label>
            <textarea
              id="note"
              name="note"
              value={formData.note}
              onChange={handleInputChange}
              placeholder="Add any additional notes (optional)"
              className="input-field textarea-field"
              rows="3"
            />
          </div>

          <button
            type="submit"
            disabled={isUploading || isSubmitting}
            className="btn btn-primary submit-btn"
          >
            {isSubmitting ? (
              <>
                <div className="spinner" />
                Generating...
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <rect x="7" y="7" width="3" height="3"></rect>
                  <rect x="14" y="7" width="3" height="3"></rect>
                  <rect x="7" y="14" width="3" height="3"></rect>
                </svg>
                Generate QR Code
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
