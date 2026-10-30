document.addEventListener("DOMContentLoaded", () => {
    const doctorRegisterForm = document.getElementById("doctorRegisterForm");
    const errorMessageDiv = document.getElementById("error-message");
    const successMessageDiv = document.getElementById("success-message");
    const submitBtn = document.getElementById("submitBtn");

    // Profile photo fields
    const profilePhotoInput = document.getElementById("profilePhotoInput");
    const profileImagePreview = document.getElementById("profileImagePreview");
    let selectedFile = null;

    // Handle Profile Photo selection and preview
    if (profilePhotoInput) {
        profilePhotoInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                selectedFile = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (event) => {
                    profileImagePreview.src = event.target.result;
                };
                reader.readAsDataURL(selectedFile);
            }
        });
    }

    // --- Specialities Chip Controller ---
    const specialityInput = document.getElementById("specialityInput");
    const addSpecialityBtn = document.getElementById("addSpecialityBtn");
    const specialitiesContainer = document.getElementById("specialitiesContainer");
    const specialitiesDataInput = document.getElementById("specialitiesData");
    const noSpecialitiesText = document.getElementById("noSpecialitiesText");
    let specialities = [];

    function updateSpecialitiesUI() {
        // Clear all chips
        const existingChips = specialitiesContainer.querySelectorAll(".chip");
        existingChips.forEach(chip => chip.remove());

        if (specialities.length === 0) {
            noSpecialitiesText.classList.remove("hidden");
        } else {
            noSpecialitiesText.classList.add("hidden");
        }

        specialities.forEach((spec, index) => {
            const chip = document.createElement("div");
            chip.className = "chip flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium border border-primary/20 hover:bg-primary/15 transition-all";
            chip.innerHTML = `
                <span>${spec}</span>
                <button type="button" class="dismiss-btn hover:bg-primary/20 rounded-full p-0.5 flex items-center justify-center transition-colors" data-index="${index}">
                    <span class="material-symbols-outlined text-[14px]">close</span>
                </button>
            `;
            specialitiesContainer.appendChild(chip);
        });

        // Update hidden field value for validation check
        specialitiesDataInput.value = JSON.stringify(specialities.map(name => ({ name })));
    }

    function addSpeciality() {
        const value = specialityInput.value.trim();
        if (value) {
            // Support comma separated entries
            const items = value.split(",").map(i => i.trim()).filter(i => i.length > 0);
            items.forEach(item => {
                if (!specialities.includes(item)) {
                    specialities.push(item);
                }
            });
            specialityInput.value = "";
            updateSpecialitiesUI();
        }
    }

    if (addSpecialityBtn) {
        addSpecialityBtn.addEventListener("click", addSpeciality);
    }

    if (specialityInput) {
        specialityInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                addSpeciality();
            }
        });
    }

    if (specialitiesContainer) {
        specialitiesContainer.addEventListener("click", (e) => {
            const dismissBtn = e.target.closest(".dismiss-btn");
            if (dismissBtn) {
                const index = parseInt(dismissBtn.getAttribute("data-index"));
                specialities.splice(index, 1);
                updateSpecialitiesUI();
            }
        });
    }

    // --- Degrees Cards Controller ---
    const addDegreeBtn = document.getElementById("addDegreeBtn");
    const degreesList = document.getElementById("degreesList");

    function updateDegreesHeaderAndRemoveButtons() {
        const cards = degreesList.querySelectorAll(".degree-card");
        cards.forEach((card, index) => {
            const heading = card.querySelector("h4");
            if (heading) {
                heading.innerHTML = `
                    <span class="material-symbols-outlined text-[18px] text-primary">school</span>
                    Degree #${index + 1}
                `;
            }

            const removeBtn = card.querySelector(".remove-degree-btn");
            if (removeBtn) {
                if (cards.length <= 1) {
                    removeBtn.classList.add("hidden");
                } else {
                    removeBtn.classList.remove("hidden");
                }
            }
        });
    }

    if (addDegreeBtn) {
        addDegreeBtn.addEventListener("click", () => {
            const newCard = document.createElement("div");
            newCard.className = "degree-card p-5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest relative shadow-sm border-l-4 border-primary";
            newCard.innerHTML = `
                <div class="flex justify-between items-center mb-4">
                    <h4 class="font-headline-sm text-[15px] font-bold text-on-surface-variant flex items-center gap-1">
                        <span class="material-symbols-outlined text-[18px] text-primary">school</span>
                        Degree #${degreesList.children.length + 1}
                    </h4>
                    <button type="button" class="remove-degree-btn text-error hover:bg-error-container/10 rounded-lg p-1.5 transition-colors">
                        <span class="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-label-sm text-on-surface-variant mb-1.5">Course Name</label>
                        <input type="text" required name="degreeCourseName[]" placeholder="e.g. Bachelor of Medicine" class="form-input w-full px-3 py-2 border border-outline rounded-lg focus:outline-none bg-surface">
                    </div>
                    <div>
                        <label class="block text-label-sm text-on-surface-variant mb-1.5">Abbreviation</label>
                        <input type="text" required name="degreeAbbreviation[]" placeholder="e.g. MBBS" class="form-input w-full px-3 py-2 border border-outline rounded-lg focus:outline-none bg-surface">
                    </div>
                    <div>
                        <label class="block text-label-sm text-on-surface-variant mb-1.5">Institution</label>
                        <input type="text" required name="degreeInstitution[]" placeholder="e.g. Harvard Medical School" class="form-input w-full px-3 py-2 border border-outline rounded-lg focus:outline-none bg-surface">
                    </div>
                    <div>
                        <label class="block text-label-sm text-on-surface-variant mb-1.5">Passing Year</label>
                        <input type="number" required name="degreePassingYear[]" placeholder="e.g. 2015" min="1950" max="2030" class="form-input w-full px-3 py-2 border border-outline rounded-lg focus:outline-none bg-surface">
                    </div>
                </div>
            `;
            degreesList.appendChild(newCard);
            updateDegreesHeaderAndRemoveButtons();
        });
    }

    if (degreesList) {
        degreesList.addEventListener("click", (e) => {
            const removeBtn = e.target.closest(".remove-degree-btn");
            if (removeBtn) {
                removeBtn.closest(".degree-card").remove();
                updateDegreesHeaderAndRemoveButtons();
            }
        });
    }

    // Submit Handling
    doctorRegisterForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorMessageDiv.classList.add("hidden");
        successMessageDiv.classList.add("hidden");

        // Validate Specialities count
        if (specialities.length === 0) {
            errorMessageDiv.textContent = "Please add at least one specialty.";
            errorMessageDiv.classList.remove("hidden");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">refresh</span> Registering...';
        submitBtn.disabled = true;

        const formData = new FormData(doctorRegisterForm);

        // Assemble Specialities
        const specPayload = specialities.map(name => ({ name }));

        // Assemble Degrees
        const degreeCourseNames = formData.getAll("degreeCourseName[]");
        const degreeAbbreviations = formData.getAll("degreeAbbreviation[]");
        const degreeInstitutions = formData.getAll("degreeInstitution[]");
        const degreePassingYears = formData.getAll("degreePassingYear[]");

        const degrees = [];
        for (let i = 0; i < degreeCourseNames.length; i++) {
            degrees.push({
                courseName: degreeCourseNames[i].trim(),
                abbreviation: degreeAbbreviations[i].trim(),
                institution: degreeInstitutions[i].trim(),
                passingYear: parseInt(degreePassingYears[i])
            });
        }

        // Construct payload
        const payload = {
            firstName: formData.get("firstName").trim(),
            middleName: formData.get("middleName") ? formData.get("middleName").trim() : "",
            lastName: formData.get("lastName").trim(),
            email: formData.get("email").trim(),
            mobile: formData.get("mobile").trim(),
            password: formData.get("password"),
            gender: formData.get("gender"),
            dateOfBirth: formData.get("dateOfBirth"),
            preferedLanguages: formData.get("preferedLanguages").trim(),
            expereince: formData.get("expereince") ? parseInt(formData.get("expereince")) : 0,
            charges: parseFloat(formData.get("charges")),
            slotDuration: formData.get("slotDuration") ? parseInt(formData.get("slotDuration")) : 15,
            hospitalId: parseInt(formData.get("hospitalId")),
            specialities: specPayload,
            degrees
        };

        try {
            const response = await fetch("/doctor/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok && data.response && data.response.status === 201) {
                const newDoctorId = data.response.data.doctor.id;

                // Handle profile photo upload if selected
                if (selectedFile) {
                    submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">refresh</span> Uploading Photo...';
                    const photoFormData = new FormData();
                    photoFormData.append("profile-photo", selectedFile);

                    const photoResponse = await fetch(`/doctor/profile-photo?doctorId=${newDoctorId}`, {
                        method: "PATCH",
                        body: photoFormData
                    });

                    const photoData = await photoResponse.json();
                    if (!photoResponse.ok || photoData.success === false) {
                        console.error("Photo upload failed:", photoData.message);
                        errorMessageDiv.textContent = "Doctor was registered, but profile photo upload failed: " + (photoData.message || "Unknown error");
                        errorMessageDiv.classList.remove("hidden");
                        setTimeout(() => {
                            window.location.href = "/admin/doctors";
                        }, 4000);
                        return;
                    }
                }

                successMessageDiv.textContent = "Doctor registered successfully! Redirecting...";
                successMessageDiv.classList.remove("hidden");
                setTimeout(() => {
                    window.location.href = "/admin/doctors";
                }, 2000);
            } else {
                errorMessageDiv.textContent = (data.response?.message || data.message || "Failed to register doctor. Please try again.");
                errorMessageDiv.classList.remove("hidden");
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (error) {
            console.error("Error submitting doctor registration:", error);
            errorMessageDiv.textContent = "A network error occurred. Please try again.";
            errorMessageDiv.classList.remove("hidden");
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Initialize list states
    updateSpecialitiesUI();
    updateDegreesHeaderAndRemoveButtons();
});
