import React, { useState, useRef, useEffect } from "react";
import QRCode from "qrcode.react";
import { useLanguage } from "../contexts/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = "dqjz4xwfg";
const CLOUDINARY_UPLOAD_PRESET = "delivery_images";

// UUID v4 generation function
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function ServiceForm() {
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    companyName: "",
    serviceHours: "",
    contactNumber: "",
    serviceType: "",
    additionalInfo: "",
    imageurl: "",
    serviceId: uuidv4(),
  });

  const [showQR, setShowQR] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [qrData, setQrData] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState("environment");

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "contactNumber") {
      const cleaned = value.replace(/[^\d\s.-]/g, "");
      setFormData((prev) => ({
        ...prev,
        [name]: cleaned,
      }));
    } else if (name === "serviceHours") {
      const hours = Math.max(0, Math.min(24, Number(value)));
      setFormData((prev) => ({
        ...prev,
        [name]: hours.toString(),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Reuse the same image handling functions from App.js
  const handleImageUpload = async (file) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError(t("errorMessages.fileTooLarge"));
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
        setSuccess(t("successMessages.imageUploaded"));
        setTimeout(() => setSuccess(""), 3000);
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      setError(t("errorMessages.uploadFailed"));
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
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Reuse camera functions from App.js
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
          errorMessage = t("errorMessages.cameraPermissionDenied");
          break;
        case "NotFoundError":
          errorMessage = t("errorMessages.cameraNotFound");
          break;
        case "NotReadableError":
          errorMessage = t("errorMessages.cameraBusy");
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
            errorMessage = t("errorMessages.cameraNotCompatible");
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
    const newFacingMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacingMode);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    await startCamera();
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

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
      setError(t("errorMessages.captureError"));
    }
  };

  const handleCameraClick = async () => {
    const hasPermission = await checkCameraPermissions();
    if (hasPermission) {
      startCamera();
    }
  };

  // Add this function to handle permissions explicitly
  const checkCameraPermissions = async () => {
    try {
      const result = await navigator.permissions.query({ name: "camera" });
      if (result.state === "denied") {
        setError(t("errorMessages.cameraBlocked"));
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

  const validateForm = () => {
    let isValid = true;
    const errors = {};

    if (!formData.companyName.trim()) {
      errors.companyName = "errorMessages.companyRequired";
      isValid = false;
    }

    if (!formData.serviceHours.trim()) {
      errors.serviceHours = "errorMessages.hoursRequired";
      isValid = false;
    }

    if (!formData.serviceType.trim()) {
      errors.serviceType = "errorMessages.serviceTypeRequired";
      isValid = false;
    }

    const cleanedPhone = formData.contactNumber.replace(/[-\s.]/g, "");
    if (!cleanedPhone) {
      errors.contactNumber = "errorMessages.phoneRequired";
      isValid = false;
    } else if (!/^0\d{8,10}$/.test(cleanedPhone)) {
      errors.contactNumber = "errorMessages.invalidPhone";
      isValid = false;
    }

    if (!formData.imageurl && !imagePreview) {
      errors.imageurl = "errorMessages.photoRequired";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const newQrData = {
        id: formData.serviceId,
        company: formData.companyName,
        hours: formData.serviceHours,
        type: formData.serviceType,
        phone: formData.contactNumber,
        info: formData.additionalInfo,
        image: formData.imageurl,
        timestamp: new Date().toISOString(),
      };

      setQrData(newQrData);
      setShowQR(true);
      setError("");
      setFormErrors({});
    } catch (err) {
      console.error("Error generating QR code:", err);
      setError(t("errorMessages.qrGenerationFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      companyName: "",
      serviceHours: "",
      contactNumber: "",
      serviceType: "",
      additionalInfo: "",
      imageurl: "",
      serviceId: uuidv4(),
    });
    setShowQR(false);
    setImagePreview("");
    setError("");
    setSuccess("");
    setFormErrors({});
    setQrData(null);
  };

  if (showQR && qrData) {
    return (
      <div className="qr-page">
        <LanguageSwitcher />
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
            <h2>{t("qrGenerated")}</h2>
            <p>{t("scanServiceQR")}</p>
          </div>

          <div className="qr-code-wrapper">
            <QRCode
              value={JSON.stringify(qrData)}
              size={200}
              level="H"
              includeMargin={true}
              fgColor="#1a1a1a"
              bgColor="#ffffff"
            />
          </div>

          <div className="delivery-summary">
            <h3>{t("serviceSummary")}</h3>
            <div className="summary-item">
              <span>{t("serviceId")}:</span>
              <span>{formData.serviceId}</span>
            </div>
            <div className="summary-item">
              <span>{t("companyName")}:</span>
              <span>{formData.companyName}</span>
            </div>
            <div className="summary-item">
              <span>{t("serviceType")}:</span>
              <span>{formData.serviceType}</span>
            </div>
            <div className="summary-item">
              <span>{t("serviceHours")}:</span>
              <span>{formData.serviceHours}</span>
            </div>
            <div className="summary-item">
              <span>{t("phone")}:</span>
              <span>{formData.contactNumber}</span>
            </div>
            {formData.additionalInfo && (
              <div className="summary-item">
                <span>{t("additionalInfo")}:</span>
                <span>{formData.additionalInfo}</span>
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
                {t("pleaseWait")}
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
                {t("createNew")}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <LanguageSwitcher />
      <h1>{t("serviceFormTitle")}</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 7h-9M20 11h-9M20 15h-9M3 7h2v2H3V7zM3 11h2v2H3v-2zM3 15h2v2H3v-2z" />
            </svg>
            {t("companyName")} <span className="required">*</span>
          </label>
          <input
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleInputChange}
            placeholder={t("companyName")}
            className="input-field"
          />
          {formErrors.companyName && (
            <div className="error-message">{t(formErrors.companyName)}</div>
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
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              {t("serviceHours")} <span className="required">*</span>
            </label>
            <input
              type="number"
              name="serviceHours"
              value={formData.serviceHours}
              onChange={handleInputChange}
              placeholder={t("serviceHours")}
              min="0"
              max="24"
              className="input-field"
            />
            {formErrors.serviceHours && (
              <div className="error-message">{t(formErrors.serviceHours)}</div>
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
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              {t("contactNumber")} <span className="required">*</span>
            </label>
            <input
              type="tel"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleInputChange}
              placeholder={t("contactNumber")}
              className="input-field"
            />
            {formErrors.contactNumber && (
              <div className="error-message">{t(formErrors.contactNumber)}</div>
            )}
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
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            {t("serviceType")} <span className="required">*</span>
          </label>
          <select
            name="serviceType"
            value={formData.serviceType}
            onChange={handleInputChange}
            className="input-field"
          >
            <option value="">{t("selectServiceType")}</option>
            <option value="maintenance">{t("maintenance")}</option>
            <option value="cleaning">{t("cleaning")}</option>
            <option value="repair">{t("repair")}</option>
            <option value="installation">{t("installation")}</option>
            <option value="other">{t("other")}</option>
          </select>
          {formErrors.serviceType && (
            <div className="error-message">{t(formErrors.serviceType)}</div>
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
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            {t("additionalInfo")}
          </label>
          <textarea
            name="additionalInfo"
            value={formData.additionalInfo}
            onChange={handleInputChange}
            placeholder={t("additionalInfo")}
            className="input-field"
            rows="3"
          />
        </div>

        <div className="form-group">
          <label>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            {t("servicePhoto")} <span className="required">*</span>
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
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div>
                    <h4>{isUploading ? t("uploading") : t("uploadPhoto")}</h4>
                    <p>{t("chooseFromDevice")}</p>
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
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  <div>
                    <h4>{t("takePhoto")}</h4>
                    <p>{t("useCamera")}</p>
                  </div>
                </button>
              </div>
            )}

            {isUploading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>{t("uploading")}</p>
              </div>
            ) : (
              imagePreview && (
                <div className="image-preview">
                  <div className="preview-container">
                    <img src={imagePreview} alt={t("servicePhoto")} />
                    <div className="preview-overlay">
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview("");
                          setFormData((prev) => ({ ...prev, imageurl: "" }));
                        }}
                        className="delete-image"
                        aria-label={t("deletePhoto")}
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
              )
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
                    aria-label={t("cancel")}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      fill="none"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="btn btn-secondary"
                    aria-label={t("switchCamera")}
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
                    aria-label={t("takePhoto")}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    >
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 20a8 8 0 100-16 8 8 0 000 16z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Hidden file inputs */}
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
            <div className="error-message">{t(formErrors.imageurl)}</div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button
          type="submit"
          className="submit-button"
          disabled={isUploading || isSubmitting}
        >
          {isSubmitting ? t("generating") : t("generateQR")}
        </button>
      </form>
    </div>
  );
}

export default ServiceForm;
