import React, { useState, useRef, useEffect } from "react";
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
    deliveryId: uuidv4(),
  });

  const [showQR, setShowQR] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState("environment"); // 'environment' for back camera, 'user' for front

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "phonenumber") {
      // Allow only numbers, spaces, dashes, and dots
      const cleaned = value.replace(/[^\d\s.-]/g, "");
      setFormData((prev) => ({
        ...prev,
        [name]: cleaned,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
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
      setShowCamera(true);
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!videoRef.current) {
        throw new Error("Video element not ready");
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not supported in this browser");
      }

      // First try to release any existing streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      console.log("Requesting camera with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Camera stream obtained");

      const videoElement = videoRef.current;
      videoElement.srcObject = stream;
      streamRef.current = stream;

      await new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
          console.log("Video metadata loaded");
          resolve();
        };
      });

      await videoElement.play();
      console.log("Video playing successfully");
      setError("");
    } catch (err) {
      console.error("Camera error details:", {
        name: err.name,
        message: err.message,
        stack: err.stack,
      });

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      let errorMessage = "Failed to access camera. ";

      switch (err.name) {
        case "NotAllowedError":
          errorMessage =
            "Please allow camera access in your browser settings and try again.";
          break;
        case "NotFoundError":
          errorMessage =
            "No camera found. Please ensure your camera is connected and not in use.";
          break;
        case "NotReadableError":
          errorMessage =
            "Camera is busy or not accessible. Please close other apps using the camera.";
          break;
        case "OverconstrainedError":
          console.log("Retrying with basic constraints...");
          try {
            const basicStream = await navigator.mediaDevices.getUserMedia({
              video: true,
            });
            if (videoRef.current) {
              videoRef.current.srcObject = basicStream;
              streamRef.current = basicStream;
              await videoRef.current.play();
              setError("");
              return;
            }
          } catch (retryErr) {
            errorMessage =
              "Camera not compatible. Please try a different camera or browser.";
          }
          break;
        default:
          errorMessage = `Camera error: ${err.message}`;
      }

      setError(errorMessage);
      setShowCamera(false);
    }
  };

  const switchCamera = async () => {
    // Toggle between front and back camera
    const newFacingMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacingMode);

    // Restart the camera with new facing mode
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    await startCamera();
  };

  // Clean up function to ensure camera is properly stopped
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Separate function to stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    try {
      if (!videoRef.current || !streamRef.current) {
        throw new Error("Camera not initialized");
      }

      const video = videoRef.current;

      // Ensure we have the actual video dimensions
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      if (!videoWidth || !videoHeight) {
        throw new Error("Video stream not ready");
      }

      const canvas = document.createElement("canvas");
      canvas.width = videoWidth;
      canvas.height = videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

      const blob = await new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.8);
      });

      if (!blob) {
        throw new Error("Failed to capture image");
      }

      const file = new File([blob], "camera-photo.jpg", { type: "image/jpeg" });
      await handleImageUpload(file);
      stopCamera();
    } catch (err) {
      console.error("Capture error:", err);
      setError("Failed to capture photo. Please try again.");
    }
  };

  // Add this function to handle permissions explicitly
  const checkCameraPermissions = async () => {
    try {
      const result = await navigator.permissions.query({ name: "camera" });
      if (result.state === "denied") {
        setError(
          "Camera access is blocked. Please allow camera access in your browser settings."
        );
        return false;
      }
      return true;
    } catch (err) {
      console.log(
        "Permissions API not supported, falling back to direct camera access"
      );
      return true;
    }
  };

  // Modify the camera button click handler
  const handleCameraClick = async () => {
    const hasPermission = await checkCameraPermissions();
    if (hasPermission) {
      startCamera();
    }
  };

  const validateForm = () => {
    let isValid = true;
    const errors = {};

    // Validate courier name
    if (!formData.couriername.trim()) {
      errors.couriername = "Courier name is required";
      isValid = false;
    }

    // Validate phone number for Malaysian format
    const cleanedPhone = formData.phonenumber.replace(/[-\s.]/g, ""); // Remove spaces, dashes, dots

    // Malaysian phone number validation
    // Handles formats:
    // 01xxxxxxxx (mobile, 10-11 digits)
    // 03xxxxxxxx (landline, 9-10 digits)
    // 0xxxxxxxxx (general format)
    if (!cleanedPhone) {
      errors.phonenumber = "Phone number is required";
      isValid = false;
    } else if (!/^0\d{8,10}$/.test(cleanedPhone)) {
      errors.phonenumber = "Please enter a valid Malaysian phone number";
      isValid = false;
    }

    // Validate packages
    if (!formData.numberofpackages || formData.numberofpackages.trim() === "") {
      errors.numberofpackages = "Number of packages is required";
      isValid = false;
    }

    // Validate image
    if (!formData.imageurl && !imagePreview) {
      errors.imageurl = "Please upload a package photo";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      // Create QR code data
      const qrData = {
        courier: formData.couriername,
        phone: formData.phonenumber,
        packages: parseInt(formData.numberofpackages),
        image: formData.imageurl,
        note: formData.note,
      };

      setShowQR(true);
      setError("");
      setFormErrors({});
    } catch (err) {
      console.error("Error generating QR code:", err);
      setError("Failed to generate QR code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      phonenumber: "",
      couriername: "",
      imageurl: "",
      numberofpackages: "",
      note: "",
      deliveryId: uuidv4(),
    });
    setShowQR(false);
    setImagePreview("");
    setError("");
    setSuccess("");
    setFormErrors({});
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
              value={JSON.stringify({
                id: formData.deliveryId,
                courier: formData.couriername,
                phone: formData.phonenumber,
                packages: parseInt(formData.numberofpackages),
                image: formData.imageurl,
                note: formData.note,
                timestamp: new Date().toISOString(),
              })}
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
              <span>Delivery ID:</span>
              <span>{formData.deliveryId}</span>
            </div>
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
            {formData.note && (
              <div className="summary-item">
                <span>Note:</span>
                <span>{formData.note}</span>
              </div>
            )}
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
    <div className="container">
      <h1>Create QR codes for package deliveries</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Courier Name <span className="required">*</span>
          </label>
          <input
            type="text"
            name="couriername"
            value={formData.couriername}
            onChange={handleInputChange}
            placeholder="Enter courier name"
            className="input-field"
          />
          {formErrors.couriername && (
            <div className="error-message">{formErrors.couriername}</div>
          )}
        </div>

        <div className="form-group">
          <label>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            Phone Number <span className="required">*</span>
          </label>
          <input
            type="tel"
            name="phonenumber"
            value={formData.phonenumber}
            onChange={handleInputChange}
            placeholder="Enter phone number"
            className="input-field"
          />
          {formErrors.phonenumber && (
            <div className="error-message">{formErrors.phonenumber}</div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              Number of Packages <span className="required">*</span>
            </label>
            <input
              type="number"
              name="numberofpackages"
              value={formData.numberofpackages}
              onChange={handleInputChange}
              placeholder="Enter number of packages"
              min="1"
              className="input-field"
            />
            {formErrors.numberofpackages && (
              <div className="error-message">{formErrors.numberofpackages}</div>
            )}
          </div>

          <div className="form-group">
            <label>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Notes
            </label>
            <input
              type="text"
              name="note"
              value={formData.note}
              onChange={handleInputChange}
              placeholder="Add a note"
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
            Package Photo <span className="required">*</span>
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
                  onClick={handleCameraClick}
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

            {showCamera && (
              <div className="camera-container">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    maxHeight: "300px",
                    objectFit: "cover",
                  }}
                />
                <div className="camera-controls">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="btn btn-secondary"
                    aria-label="Cancel"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      fill="none"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="btn btn-secondary"
                    aria-label="Switch Camera"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    >
                      <path d="M16 3h5v5" />
                      <path d="M3 16v5h5" />
                      <path d="M21 3l-7 7" />
                      <path d="M3 21l7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="btn btn-primary"
                    aria-label="Take Photo"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    >
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M12 20a8 8 0 100-16 8 8 0 000 16z" />
                    </svg>
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
                        setImagePreview("");
                        setFormData((prev) => ({ ...prev, imageurl: "" }));
                      }}
                      className="delete-image"
                      aria-label="Delete photo"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                      >
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: "none" }}
            />

            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
            />
          </div>
          {formErrors.imageurl && (
            <div className="error-message">{formErrors.imageurl}</div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button
          type="submit"
          className="submit-button"
          disabled={isUploading || isSubmitting}
        >
          {isSubmitting ? "Generating..." : "Generate QR Code"}
        </button>
      </form>

      {showQR && (
        <div className="qr-result">
          <QRCode
            value={JSON.stringify({
              id: formData.deliveryId,
              courier: formData.couriername,
              phone: formData.phonenumber,
              packages: parseInt(formData.numberofpackages),
              image: formData.imageurl,
              note: formData.note,
              timestamp: new Date().toISOString(),
            })}
            size={256}
            level="H"
          />
          <p>Scan this QR code to view delivery details</p>
        </div>
      )}
    </div>
  );
}

export default App;
