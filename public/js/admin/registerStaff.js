document.addEventListener("DOMContentLoaded", () => {
    const staffRegisterForm = document.getElementById("staffRegisterForm");
    const errorMessageDiv = document.getElementById("error-message");
    const errorMessageText = document.getElementById("error-message-text");
    const successMessageDiv = document.getElementById("success-message");
    const successMessageText = document.getElementById("success-message-text");
    const validationSummary = document.getElementById("validation-summary");
    const validationSummaryList = document.getElementById("validation-summary-list");
    const submitBtn = document.getElementById("submitBtn");

    const profilePhotoInput = document.getElementById("profilePhotoInput");
    const profilePhotoBtn = document.getElementById("profilePhotoBtn");
    const profileImagePreview = document.getElementById("profileImagePreview");

    const FIELD_LABELS = {
        firstName: "First Name",
        middleName: "Middle Name",
        lastName: "Last Name",
        email: "Email Address",
        mobile: "Mobile Number",
        password: "Password",
        gender: "Gender",
        dateOfBirth: "Date of Birth",
        hospitalId: "Hospital Branch",
        profilePhoto: "Profile Photo",
    };

    const VALIDATED_FIELDS = [
        "firstName",
        "middleName",
        "lastName",
        "email",
        "mobile",
        "password",
        "gender",
        "dateOfBirth",
        "hospitalId",
        "profilePhoto",
    ];

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const MOBILE_REGEX = /^\+?[1-9]\d{9,14}$/;
    const NAME_REGEX = /^[a-zA-Z\s'-]+$/;
    const MIN_STAFF_AGE = 18;
    const MAX_PHOTO_SIZE_MB = 5;
    const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    function getFieldElements(field) {
        const group = staffRegisterForm.querySelector(`[data-field="${field}"]`) ||
            document.querySelector(`[data-field="${field}"]`);
        if (!group) return {};

        const input = group.querySelector(`#${field}`) ||
            group.querySelector(`[name="${field}"]`) ||
            group.querySelector("input, select");
        const errorEl = group.querySelector(".field-error") || document.getElementById(`${field}-error`);

        return { group, input, errorEl };
    }

    function formatFieldError(message) {
        return `<span class="material-symbols-outlined">error</span><span>${message}</span>`;
    }

    function showFieldError(field, message) {
        const { group, input, errorEl } = getFieldElements(field);
        if (!group || !input || !errorEl) return;

        input.classList.add("is-invalid");
        input.setAttribute("aria-invalid", "true");
        errorEl.innerHTML = formatFieldError(message);
        errorEl.classList.remove("hidden");
    }

    function clearFieldError(field) {
        const { input, errorEl } = getFieldElements(field);
        if (!input || !errorEl) return;

        input.classList.remove("is-invalid");
        input.removeAttribute("aria-invalid");
        errorEl.innerHTML = "";
        errorEl.classList.add("hidden");
    }

    function clearAllFieldErrors() {
        VALIDATED_FIELDS.forEach(clearFieldError);
    }

    function hideGlobalMessages() {
        errorMessageDiv.classList.add("hidden");
        errorMessageText.textContent = "";
        successMessageDiv.classList.add("hidden");
        successMessageText.textContent = "";
        validationSummary.classList.add("hidden");
        validationSummaryList.innerHTML = "";
    }

    function showValidationSummary(errors) {
        const entries = Object.entries(errors);
        if (entries.length === 0) return;

        validationSummaryList.innerHTML = entries
            .map(([field, message]) => `<li><strong>${FIELD_LABELS[field] || field}:</strong> ${message}</li>`)
            .join("");
        validationSummary.classList.remove("hidden");
    }

    function showGlobalError(message) {
        errorMessageText.textContent = message;
        errorMessageDiv.classList.remove("hidden");
    }

    function showGlobalSuccess(message) {
        successMessageText.textContent = message;
        successMessageDiv.classList.remove("hidden");
    }

    function calculateAge(dateString) {
        const dob = new Date(dateString);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age -= 1;
        }
        return age;
    }

    function validateName(value, label, { required = true, min = 2, max = 50 } = {}) {
        const trimmed = (value || "").trim();

        if (!trimmed) {
            return required ? `${label} is required.` : null;
        }
        if (trimmed.length < min) {
            return `${label} must be at least ${min} characters.`;
        }
        if (trimmed.length > max) {
            return `${label} must not exceed ${max} characters.`;
        }
        if (!NAME_REGEX.test(trimmed)) {
            return `${label} may only contain letters, spaces, hyphens, and apostrophes.`;
        }
        return null;
    }

    function validateField(field, values) {
        switch (field) {
            case "firstName":
                return validateName(values.firstName, "First name");
            case "middleName":
                return values.middleName.trim()
                    ? validateName(values.middleName, "Middle name", { required: false })
                    : null;
            case "lastName":
                return validateName(values.lastName, "Last name");
            case "email": {
                const email = values.email.trim();
                if (!email) return "Email address is required.";
                if (!EMAIL_REGEX.test(email)) return "Please enter a valid email address.";
                if (email.length > 100) return "Email must not exceed 100 characters.";
                return null;
            }
            case "mobile": {
                const mobile = values.mobile.trim().replace(/\s/g, "");
                if (!mobile) return "Mobile number is required.";
                if (!MOBILE_REGEX.test(mobile)) {
                    return "Enter a valid mobile number (10–15 digits, no leading zero).";
                }
                return null;
            }
            case "password": {
                const password = values.password || "";
                if (!password) return "Password is required.";
                if (password.length < 8) return "Password must be at least 8 characters.";
                if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
                if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
                if (password.length > 128) return "Password must not exceed 128 characters.";
                return null;
            }
            case "gender":
                if (!values.gender) return "Please select a gender.";
                return null;
            case "dateOfBirth": {
                const dob = values.dateOfBirth;
                if (!dob) return "Date of birth is required.";
                if (Number.isNaN(Date.parse(dob))) return "Please enter a valid date of birth.";

                const dobDate = new Date(dob);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (dobDate >= today) return "Date of birth cannot be today or in the future.";

                const age = calculateAge(dob);
                if (age < MIN_STAFF_AGE) return `Staff member must be at least ${MIN_STAFF_AGE} years old.`;
                if (age > 100) return "Please enter a valid date of birth.";
                return null;
            }
            case "hospitalId":
                if (!values.hospitalId) return "Please select a hospital branch.";
                return null;
            case "profilePhoto": {
                const file = values.profilePhotoFile;
                if (!file) return null;
                if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
                    return "Photo must be JPG, PNG, WebP, or GIF.";
                }
                if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
                    return `Photo must be smaller than ${MAX_PHOTO_SIZE_MB} MB.`;
                }
                return null;
            }
            default:
                return null;
        }
    }

    function getFormValues() {
        const formData = new FormData(staffRegisterForm);
        return {
            firstName: formData.get("firstName") || "",
            middleName: formData.get("middleName") || "",
            lastName: formData.get("lastName") || "",
            email: formData.get("email") || "",
            mobile: formData.get("mobile") || "",
            password: formData.get("password") || "",
            gender: formData.get("gender") || "",
            dateOfBirth: formData.get("dateOfBirth") || "",
            hospitalId: formData.get("hospitalId") || "",
            profilePhotoFile: profilePhotoInput?.files?.[0] || null,
        };
    }

    function validateForm() {
        const values = getFormValues();
        const errors = {};

        VALIDATED_FIELDS.forEach((field) => {
            const message = validateField(field, values);
            if (message) errors[field] = message;
        });

        return errors;
    }

    function applyValidationErrors(errors) {
        clearAllFieldErrors();
        Object.entries(errors).forEach(([field, message]) => showFieldError(field, message));
        showValidationSummary(errors);

        const firstInvalid = staffRegisterForm.querySelector(".is-invalid");
        if (firstInvalid) {
            firstInvalid.focus({ preventScroll: true });
            firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
            validationSummary.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    function validateSingleField(field) {
        const values = getFormValues();
        const message = validateField(field, values);
        if (message) {
            showFieldError(field, message);
        } else {
            clearFieldError(field);
        }
        return !message;
    }

    VALIDATED_FIELDS.forEach((field) => {
        const { input } = getFieldElements(field);
        if (!input || field === "profilePhoto") return;

        input.addEventListener("blur", () => validateSingleField(field));
        input.addEventListener("input", () => {
            if (input.classList.contains("is-invalid")) {
                validateSingleField(field);
            }
        });
        input.addEventListener("change", () => {
            if (input.classList.contains("is-invalid")) {
                validateSingleField(field);
            }
        });
    });

    if (profilePhotoBtn && profilePhotoInput) {
        profilePhotoBtn.addEventListener("click", () => profilePhotoInput.click());

        profilePhotoInput.addEventListener("change", (e) => {
            clearFieldError("profilePhoto");
            const file = e.target.files?.[0];

            if (!file) return;

            const photoError = validateField("profilePhoto", { profilePhotoFile: file });
            if (photoError) {
                showFieldError("profilePhoto", photoError);
                profilePhotoInput.value = "";
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                profileImagePreview.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    staffRegisterForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideGlobalMessages();

        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            applyValidationErrors(errors);
            return;
        }

        const values = getFormValues();
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">refresh</span> Registering...';
        submitBtn.disabled = true;

        const payload = {
            firstName: values.firstName.trim(),
            middleName: values.middleName.trim(),
            lastName: values.lastName.trim(),
            email: values.email.trim(),
            mobile: values.mobile.trim().replace(/\s/g, ""),
            password: values.password,
            gender: values.gender,
            dateOfBirth: values.dateOfBirth,
            hospitalId: values.hospitalId,
        };

        if (!payload.middleName) {
            delete payload.middleName;
        }

        try {
            const response = await fetch("/admin/staff/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showGlobalSuccess("Staff registered successfully! Redirecting to staff list...");
                setTimeout(() => {
                    window.location.href = "/admin/staff";
                }, 2000);
            } else {
                showGlobalError(data.message || "Failed to register staff. Please try again.");
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        } catch (error) {
            console.error("Error submitting staff registration:", error);
            showGlobalError("A network error occurred. Please check your connection and try again.");
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    });
});
