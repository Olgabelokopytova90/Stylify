import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  saveOnboardingProfile,
  uploadAvatarPhoto,
  createAvatarGeneration,
  generateAvatarFromPhoto,
  getLatestAvatarGeneration,
  saveAvatarRecord, getProfile, getStylePreferences
} from "../api/client";

const bodyTypes = [
  { label: "Hourglass", value: "hourglass", icon: "⌛" },
  { label: "Pear", value: "pear", icon: "▽" },
  { label: "Apple", value: "apple", icon: "○" },
  { label: "Rectangle", value: "rectangle", icon: "▯" },
  { label: "Not sure", value: "not_sure", icon: "?" },
];

const fitOptions = [
  { label: "Fitted", value: "fitted", icon: "◡" },
  { label: "Regular", value: "regular", icon: "T" },
  { label: "Oversized", value: "oversized", icon: "□" },
  { label: "Mixed", value: "mixed", icon: "↔" },
];

const styleOptions = [
  "Minimal",
  "Classic",
  "Casual",
  "Chic",
  "Romantic",
  "Streetwear",
  "Boho",
  "Sporty",
];

export default function OnboardingPage() {
  const [displayName, setDisplayName] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [initialBodyType, setInitialBodyType] = useState("");
  const [fitPreference, setFitPreference] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
const [selectedPhotoPreviewUrl, setSelectedPhotoPreviewUrl] = useState("");
const [photoUploaded, setPhotoUploaded] = useState(false);
const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

const { user, signOut } = useAuth();
const navigate = useNavigate();
const location = useLocation();

const isEditMode = location.search.includes("mode=edit");
  

  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
  async function loadExistingProfile() {
    if (!user?.id || !isEditMode) return;

    try {
      const profile = await getProfile(user.id);
      const styles = await getStylePreferences(user.id);

      setDisplayName(profile.display_name || "");
      setBodyType(profile.body_type || "");
setInitialBodyType(profile.body_type || "");
      setFitPreference(profile.fit_preference || "");
      setSelectedStyles(styles);
      setPhotoUploaded(Boolean(profile.reference_photo_url));
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to load your style profile.");
    }
  }

  void loadExistingProfile();
}, [user?.id, isEditMode]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!user?.id) {
    setErrorMessage("User session was not found. Please sign in again.");
    return;
  }

  setSelectedPhoto(file);
  setSelectedPhotoPreviewUrl(URL.createObjectURL(file));
  setPhotoUploaded(false);
  setErrorMessage("");
  setIsUploadingPhoto(true);

  try {
    await uploadAvatarPhoto(user.id, file);
    setPhotoUploaded(true);
  } catch (error) {
    console.error(error);
    setErrorMessage("Failed to upload photo. Please try again.");
    setPhotoUploaded(false);
  } finally {
    setIsUploadingPhoto(false);
  }
}

  function toggleStyle(style: string) {
    setSelectedStyles((current) =>
      current.includes(style)
        ? current.filter((item) => item !== style)
        : [...current, style]
    );
  };

  async function handleContinue() {
  if (!user?.id) {
    setErrorMessage("User session was not found. Please sign in again.");
    return;
  }

  if (!displayName.trim()) {
    setErrorMessage("Please enter your name.");
    return;
  }

  if (!bodyType) {
    setErrorMessage("Please select your body type.");
    return;
  }

  if (!fitPreference) {
    setErrorMessage("Please select your fit preference.");
    return;
  }

  if (selectedStyles.length === 0) {
    setErrorMessage("Please select at least one style.");
    return;
  }

  if (!photoUploaded) {
  setErrorMessage("Please upload a reference photo before continuing.");
  return;
}

  setErrorMessage("");
  setIsSaving(true);

  try {
  await saveOnboardingProfile(user.id, {
    display_name: displayName.trim(),
    body_type: bodyType,
    fit_preference: fitPreference,
    styles: selectedStyles,
  });

  const shouldGenerateAvatar =
  !isEditMode || Boolean(selectedPhoto) || bodyType !== initialBodyType;

if (shouldGenerateAvatar) {
  setIsGeneratingAvatar(true);

  const avatarBodyType =
    bodyType === "rectangle" ||
    bodyType === "pear" ||
    bodyType === "hourglass" ||
    bodyType === "apple"
      ? bodyType
      : "rectangle";

  const created = await createAvatarGeneration(user.id);

  await generateAvatarFromPhoto(created.id, avatarBodyType);

  const latestAvatar = await getLatestAvatarGeneration(user.id);

  if (latestAvatar?.image_url) {
    await saveAvatarRecord(user.id, latestAvatar.image_url);
  }
}

navigate("/app");

} catch (error) {
    console.error(error);
    setErrorMessage(
      error instanceof Error ? error.message : "Failed to save onboarding profile."
    );
  } finally {
    setIsSaving(false);
setIsGeneratingAvatar(false);

  }
}

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#e9ded2",
        color: "#1f1a17",
        padding: "18px",
        boxSizing: "border-box",
      }}
    >
      <div
  style={{
    width: "96vw",
    maxWidth: "1480px",
    minHeight: "92vh",
    margin: "0 auto",
    background: "#f8f4ed",
    borderRadius: "28px",
    overflow: "hidden",
    boxShadow: "0 24px 80px rgba(58, 42, 28, 0.14)",
    border: "1px solid rgba(255,255,255,0.7)",
  }}
>
        <header
          style={{
            height: "86px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 52px",
            borderBottom: "1px solid #e6d9cc",
            background: "rgba(255,255,255,0.58)",
          }}
        >
          <div
            style={{
              fontSize: "28px",
              letterSpacing: "0.28em",
              fontWeight: 500,
            }}
          >
            STYLIFY
          </div>

          <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "18px",
  }}
>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "14px",
      color: "#7a6a60",
      fontSize: "13px",
      fontWeight: 600,
      textTransform: "uppercase",
    }}
  >
    Step 1 of 4
    <div style={{ display: "flex", gap: "8px" }}>
      {[0, 1, 2, 3].map((step) => (
        <span
          key={step}
          style={{
            width: "46px",
            height: "4px",
            borderRadius: "999px",
            background: step === 0 ? "#a87445" : "#e4d8cc",
            display: "block",
          }}
        />
      ))}
    </div>
  </div>

  <button
    type="button"
    onClick={async () => {
      await signOut();
      navigate("/login", { replace: true });
    }}
    style={{
      height: "36px",
      padding: "0 16px",
      borderRadius: "999px",
      border: "1px solid #d9cabe",
      background: "#fffdf9",
      color: "#2e2a25",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    Sign out
  </button>
</div>
        </header>

        <div
  style={{
    display: "grid",
    gridTemplateColumns: "430px 1fr",
    height: "calc(92vh - 86px)",
    minHeight: 0,
  }}
>
  <aside
    style={{
      height: "100%",
      minHeight: 0,
      backgroundImage: "url('/images/onboarding-panel.png')",
      backgroundSize: "cover",
      backgroundPosition: "center top",
      backgroundRepeat: "no-repeat",
      borderRight: "1px solid #e6d9cc",
    }}
  />

  <section
    style={{
      background: "#fbf8f3",
      padding: "64px 68px",
      overflowY: "auto",
      minHeight: 0,
    }}
  >
            <p
              style={{
                margin: "0 0 18px",
                textTransform: "uppercase",
                letterSpacing: "0.24em",
                color: "#a87445",
                fontWeight: 700,
                fontSize: "12px",
              }}
            >
              {isEditMode ? "Edit profile" : "Welcome to Stylify"}
            </p>

            <h1
              style={{
                margin: "0 0 18px",
                maxWidth: "760px",
                fontSize: "56px",
                lineHeight: 1.04,
                fontWeight: 500,
                fontFamily: "serif",
              }}
            >
              {isEditMode
  ? "Update your personal style profile"
  : "Let’s create your personal style profile"}
            </h1>

            <p
              style={{
                margin: "0 0 44px",
                maxWidth: "620px",
                color: "#6f625a",
                fontSize: "18px",
                lineHeight: 1.65,
              }}
            >
              {isEditMode
  ? "Adjust your saved preferences, update your photo, or regenerate your avatar."
  : "Tell us a few things about yourself so we can build your avatar and recommend outfits you’ll love."}
            </p>

            <div style={{ display: "grid", gap: "34px" }}>
              <section>
                <h2 style={sectionTitleStyle}>What should we call you?</h2>
                <p style={sectionTextStyle}>This will be your name in the app.</p>

                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  style={{
                    width: "100%",
                    height: "58px",
                    borderRadius: "16px",
                    border: "1px solid #d9cabe",
                    background: "#fffdf9",
                    padding: "0 18px",
                    fontSize: "16px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </section>

              <section>
                <h2 style={sectionTitleStyle}>What’s your body type?</h2>
                <p style={sectionTextStyle}>
                  This helps us personalize your avatar and recommendations.
                </p>

                <div style={cardGridStyle}>
                  {bodyTypes.map((option) => {
                    const selected = bodyType === option.value;

                    return (
                      <button
                        key={option.value}
                        onClick={() => setBodyType(option.value)}
                        style={{
                          ...choiceCardStyle,
                          border: selected
                            ? "2px solid #a87445"
                            : "1px solid #d9cabe",
                          background: selected ? "#f3e6da" : "#fffdf9",
                        }}
                      >
                        <span style={{ fontSize: "28px" }}>{option.icon}</span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h2 style={sectionTitleStyle}>
                  How do you prefer your clothes to fit?
                </h2>
                <p style={sectionTextStyle}>
                  Choose the option that best describes your usual preference.
                </p>

                <div style={cardGridStyle}>
                  {fitOptions.map((option) => {
                    const selected = fitPreference === option.value;

                    return (
                      <button
                        key={option.value}
                        onClick={() => setFitPreference(option.value)}
                        style={{
                          ...choiceCardStyle,
                          border: selected
                            ? "2px solid #a87445"
                            : "1px solid #d9cabe",
                          background: selected ? "#f3e6da" : "#fffdf9",
                        }}
                      >
                        <span style={{ fontSize: "28px" }}>{option.icon}</span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
  <h2 style={sectionTitleStyle}>Upload your reference photo</h2>
  <p style={sectionTextStyle}>
    Add a clear front-facing photo so we can create your personalized avatar.
  </p>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: selectedPhotoPreviewUrl ? "160px 1fr" : "1fr",
      gap: "18px",
      alignItems: "center",
      background: "#fffdf9",
      border: photoUploaded ? "2px solid #a87445" : "1px solid #d9cabe",
      borderRadius: "18px",
      padding: "18px",
    }}
  >
    {selectedPhotoPreviewUrl ? (
      <img
        src={selectedPhotoPreviewUrl}
        alt="Selected reference"
        style={{
          width: "160px",
          height: "160px",
          borderRadius: "16px",
          objectFit: "cover",
          border: "1px solid #e4d8cc",
          background: "#f3ede7",
        }}
      />
    ) : null}

    <div>
      <input
        id="onboardingPhotoInput"
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onClick={(e) => {
          (e.currentTarget as HTMLInputElement).value = "";
        }}
        onChange={handlePhotoChange}
      />

      <button
        type="button"
        onClick={() =>
          document.getElementById("onboardingPhotoInput")?.click()
        }
        disabled={isUploadingPhoto || isGeneratingAvatar}
        style={{
          height: "52px",
          padding: "0 22px",
          borderRadius: "999px",
          border: "none",
          background: "#2e2a25",
          color: "#fff",
          fontWeight: 800,
          cursor:
            isUploadingPhoto || isGeneratingAvatar ? "not-allowed" : "pointer",
          opacity: isUploadingPhoto || isGeneratingAvatar ? 0.7 : 1,
        }}
      >
        {isUploadingPhoto
          ? "Uploading photo..."
          : selectedPhoto
          ? "Choose another photo"
          : "Upload photo"}
      </button>

      <p
        style={{
          margin: "14px 0 0",
          color: photoUploaded ? "#5c8a64" : "#7a6a60",
          fontSize: "14px",
          fontWeight: 600,
        }}
      >
        {photoUploaded
          ? "Photo uploaded ✓"
          : "Your photo is required before creating an avatar."}
      </p>
    </div>
  </div>
</section>

              <section>
                <h2 style={sectionTitleStyle}>
                  Which styles do you love?{" "}
                  <span style={{ color: "#8a7667", fontSize: "16px" }}>
                    Select all that apply
                  </span>
                </h2>
                <p style={sectionTextStyle}>
                  Pick the styles that inspire your wardrobe.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: "14px",
                  }}
                >
                  {styleOptions.map((style) => {
                    const value = style.toLowerCase();
                    const selected = selectedStyles.includes(value);

                    return (
                      <button
                        key={style}
                        onClick={() => toggleStyle(value)}
                        style={{
                          height: "48px",
                          borderRadius: "14px",
                          border: selected
                            ? "2px solid #a87445"
                            : "1px solid #d9cabe",
                          background: selected ? "#f3e6da" : "#fffdf9",
                          color: "#2e2a25",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {style}
                      </button>
                    );
                  })}
                </div>
              </section>

              {errorMessage ? (
  <p
    style={{
      margin: 0,
      color: "#8a2f2f",
      fontSize: "14px",
      fontWeight: 600,
      textAlign: "center",
    }}
  >
    {errorMessage}
  </p>
) : null}

<button
  type="button"
  onClick={handleContinue}
  disabled={isSaving || isUploadingPhoto || isGeneratingAvatar}
  style={{
    marginTop: "8px",
    height: "58px",
    borderRadius: "14px",
    border: "none",
    background: isSaving || isUploadingPhoto || isGeneratingAvatar ? "#8f867e" : "#a87445",
    color: "#fff",
    fontSize: "18px",
    fontWeight: 700,
    cursor: isSaving || isUploadingPhoto || isGeneratingAvatar ? "not-allowed" : "pointer",
  }}
>
  {isGeneratingAvatar
  ? "Creating your avatar..."
  : isSaving
  ? "Saving..."
  : isEditMode
  ? "Save changes →"
  : "Continue →"}
</button>

              <p
                style={{
                  margin: 0,
                  textAlign: "center",
                  color: "#8a7667",
                  fontSize: "14px",
                }}
              >
                You can change this later
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: "24px",
  fontWeight: 600,
  fontFamily: "serif",
};

const sectionTextStyle: React.CSSProperties = {
  margin: "0 0 16px",
  color: "#7a6a60",
  fontSize: "15px",
};

const cardGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "14px",
};

const choiceCardStyle: React.CSSProperties = {
  height: "116px",
  borderRadius: "16px",
  color: "#2e2a25",
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
};