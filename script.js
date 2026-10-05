/**
 * ==========================================================
 * CarePlus Hospital - JavaScript Functionality (script.js)
 * Project: Evaluation Summer Internship (ESI) Project
 * Features:
 *   1. Department-Doctor dynamic mapping
 *   2. Date picker validation (disallow past dates)
 *   3. Appointment form validation (Create & Update modes)
 *   4. Permanent storage in browser localStorage
 *   5. Sequential Appointment Dashboard rendering
 *   6. Ownership-verified Update (Edit) functionality
 *   7. Ownership-verified Delete (Cancel) functionality
 *   8. Quick-booking shortcuts from cards
 *   9. Responsive mobile menu navigation
 * ==========================================================
 */
// Key used to store appointments array in browser localStorage
const STORAGE_KEY = "careplus_appointments";
// Tracks which appointment is currently being updated (null when in "Book New" mode)
let editingAppointmentId = null;
// Logical mapping between each of the 10 Departments and its assigned Doctor
const departmentDoctorMap = {
  "General Medicine": "Dr. Ananya Das",
  "Cardiology": "Dr. Rajesh Mishra",
  "Neurology": "Dr. Suman Patnaik",
  "Orthopedics": "Dr. Abhishek Mohanty",
  "Dermatology": "Dr. Priya Rout",
  "Pediatrics": "Dr. Rakesh Behera",
  "Gynecology": "Dr. Sneha Nayak",
  "ENT": "Dr. Amit Pradhan",
  "Ophthalmology": "Dr. Pooja Sahu",
  "Diabetes & Endocrinology": "Dr. Debasish Jena"
};
// DOM ELEMENT REFERENCES
const appointmentForm = document.getElementById("appointmentForm");
const departmentSelect = document.getElementById("departmentSelect");
const doctorSelect = document.getElementById("doctorSelect");
const appointmentDate = document.getElementById("appointmentDate");
const appointmentTime = document.getElementById("appointmentTime");
const successMessage = document.getElementById("successMessage");
const successDetails = document.getElementById("successDetails");
const appointmentTableBody = document.getElementById("appointmentTableBody");
const menuToggle = document.getElementById("menuToggle");
const navbar = document.getElementById("navbar");
// Submit button in form (used to toggle between "Book Appointment" and "Update Appointment")
const submitBtn = appointmentForm ? appointmentForm.querySelector("button[type='submit']") : null;
// ==========================================================
// 1. INITIALIZATION ON PAGE LOAD
// ==========================================================
document.addEventListener("DOMContentLoaded", function () {
  // Set minimum date to today so past dates cannot be selected
  setMinAppointmentDate();
  // Load and render all existing appointments from localStorage
  loadAppointments();
  // Listen for changes on the Department dropdown to update the Doctor
  if (departmentSelect) {
    departmentSelect.addEventListener("change", function () {
      updateDoctors(this.value);
    });
  }
  // Listen for Appointment form submission (handles both Create and Update)
  if (appointmentForm) {
    appointmentForm.addEventListener("submit", handleAppointmentSubmit);
  }
  // Setup mobile navigation toggle
  setupMobileNavigation();
});
// ==========================================================
// 2. DATE VALIDATION (PREVENT PAST DATES)
// ==========================================================
/**
 * Sets the 'min' attribute of the appointment date input to today's date (YYYY-MM-DD).
 * This prevents patients from selecting any previous dates.
 */
function setMinAppointmentDate() {
  const today = new Date();
  const year = today.getFullYear();
  // Pad month and day with leading zero if less than 10
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const formattedToday = `${year}-${month}-${day}`;
  if (appointmentDate) {
    appointmentDate.setAttribute("min", formattedToday);
  }
}
// ==========================================================
// 3. DEPARTMENT & DOCTOR LINKING
// ==========================================================
/**
 * Updates the Doctor dropdown based on the chosen department.
 * @param {string} selectedDept - The department selected by the patient
 * @param {string} [preferredDoctor=""] - Optional specific doctor to pre-select
 */
function updateDoctors(selectedDept, preferredDoctor = "") {
  if (!doctorSelect) return;
  // Clear existing options
  doctorSelect.innerHTML = "";
  if (!selectedDept || !departmentDoctorMap[selectedDept]) {
    // If no valid department chosen yet
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- Select Department First --";
    doctorSelect.appendChild(defaultOption);
    return;
  }
  // Get the assigned doctor for the selected department
  const assignedDoctor = departmentDoctorMap[selectedDept];
  // Default helper option
  const chooseOption = document.createElement("option");
  chooseOption.value = "";
  chooseOption.textContent = "-- Choose Doctor --";
  doctorSelect.appendChild(chooseOption);
  // Add the assigned doctor option
  const doctorOption = document.createElement("option");
  doctorOption.value = assignedDoctor;
  doctorOption.textContent = assignedDoctor;
  doctorSelect.appendChild(doctorOption);
  // Auto-select the doctor (or preferred doctor if passed)
  if (preferredDoctor && preferredDoctor === assignedDoctor) {
    doctorSelect.value = preferredDoctor;
  } else {
    doctorSelect.value = assignedDoctor;
  }
}
// ==========================================================
// 4. QUICK BOOKING BUTTON SHORTCUTS
// ==========================================================
function bookDepartment(deptName) {
  if (departmentSelect) {
    departmentSelect.value = deptName;
    updateDoctors(deptName);
    scrollToAppointmentForm();
  }
}
function bookDoctor(deptName, doctorName) {
  if (departmentSelect) {
    departmentSelect.value = deptName;
    updateDoctors(deptName, doctorName);
    scrollToAppointmentForm();
  }
}
function scrollToAppointmentForm() {
  const section = document.getElementById("appointment");
  if (section) {
    section.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => {
      const nameInput = document.getElementById("patientName");
      if (nameInput) nameInput.focus();
    }, 400);
  }
}
// ==========================================================
// 5. SECURITY / OWNERSHIP VERIFICATION LOGIC
// ==========================================================
/**
 * Verifies if the person attempting to Edit or Delete is the actual owner.
 * Compares the entered phone number or email against the record's registered data.
 *
 * @param {Object} appointment - The target appointment record
 * @param {string} actionName - 'update' or 'delete'
 * @returns {boolean} True if verified, false if unauthorized
 */
function verifyOwnership(appointment, actionName) {
  const enteredInput = prompt(
    `🔒 Security Verification:\nPlease enter your registered 10-digit Mobile Number or Email to ${actionName} this appointment:`
  );
  // User pressed 'Cancel' in prompt
  if (enteredInput === null) {
    return false;
  }
  const cleanInput = enteredInput.trim().toLowerCase();
  const regPhone = String(appointment.phone || "").trim().toLowerCase();
  const regEmail = String(appointment.email || "").trim().toLowerCase();
  // Check if input matches registered phone or email
  const isMatch = cleanInput !== "" && (cleanInput === regPhone || cleanInput === regEmail);
  if (!isMatch) {
    // Required Alert: Person A cannot update or delete Person B's record
    alert(`⛔ Access Denied!\nYou can only ${actionName} your own records.`);
    return false;
  }
  return true;
}
// ==========================================================
// 6. UPDATE (EDIT) APPOINTMENT RECORD
// ==========================================================
/**
 * Initiates the update flow:
 * 1. Checks ownership verification
 * 2. Pre-fills the form with existing data
 * 3. Switches the form to 'Update Mode'
 */
function handleEditAppointment(id) {
  const appointments = getAppointmentsFromStorage();
  const target = appointments.find((app) => app.id === Number(id));
  if (!target) {
    alert("Error: Appointment record not found.");
    return;
  }
  // Verify ownership: only the owner can edit
  const isAuthorized = verifyOwnership(target, "update");
  if (!isAuthorized) {
    return;
  }
  // Set the active editing ID
  editingAppointmentId = target.id;
  // Pre-fill form fields
  document.getElementById("patientName").value = target.patientName;
  document.getElementById("patientAge").value = target.age;
  document.getElementById("patientGender").value = target.gender;
  document.getElementById("patientPhone").value = target.phone;
  document.getElementById("patientEmail").value = target.email;
  
  if (departmentSelect) {
    departmentSelect.value = target.department;
    updateDoctors(target.department, target.doctor);
  }
  
  if (appointmentDate) appointmentDate.value = target.date;
  if (appointmentTime) appointmentTime.value = target.time;
  document.getElementById("visitReason").value = target.reason;
  // Change submit button text to indicate update mode
  if (submitBtn) {
    submitBtn.textContent = `Update Appointment #${target.id}`;
    submitBtn.style.backgroundColor = "#0284c7"; // Distinct accent color
  }
  // Add a "Cancel Edit" button next to submit if not already present
  addCancelEditButton();
  // Scroll to form so user can make changes
  scrollToAppointmentForm();
  // Show inline notification
  alert(`Record verified! You are now editing Appointment #${target.id}. Make changes and click 'Update Appointment'.`);
}
/**
 * Adds a 'Cancel Edit' button to exit update mode without saving.
 */
function addCancelEditButton() {
  if (document.getElementById("cancelEditBtn")) return;
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.id = "cancelEditBtn";
  cancelBtn.textContent = "Cancel Edit";
  cancelBtn.style.marginLeft = "10px";
  cancelBtn.style.backgroundColor = "#64748b";
  cancelBtn.style.color = "#ffffff";
  cancelBtn.style.border = "none";
  cancelBtn.style.padding = "0.75rem 1.5rem";
  cancelBtn.style.borderRadius = "50px";
  cancelBtn.style.cursor = "pointer";
  cancelBtn.style.fontWeight = "600";
  cancelBtn.addEventListener("click", cancelEditMode);
  if (submitBtn && submitBtn.parentNode) {
    submitBtn.parentNode.appendChild(cancelBtn);
  }
}
/**
 * Resets the form back to normal "Book New Appointment" mode.
 */
function cancelEditMode() {
  editingAppointmentId = null;
  appointmentForm.reset();
  updateDoctors("");
  if (submitBtn) {
    submitBtn.textContent = "Book Appointment";
    submitBtn.style.backgroundColor = ""; // Reset to default
  }
  const cancelBtn = document.getElementById("cancelEditBtn");
  if (cancelBtn) {
    cancelBtn.remove();
  }
}
// ==========================================================
// 7. DELETE APPOINTMENT RECORD
// ==========================================================
/**
 * Handles appointment deletion:
 * 1. Checks ownership verification
 * 2. Confirms deletion
 * 3. Removes from localStorage and updates the dashboard
 */
function handleDeleteAppointment(id) {
  const appointments = getAppointmentsFromStorage();
  const target = appointments.find((app) => app.id === Number(id));
  if (!target) {
    alert("Error: Appointment record not found.");
    return;
  }
  // Verify ownership: only the owner can delete
  const isAuthorized = verifyOwnership(target, "delete");
  if (!isAuthorized) {
    return;
  }
  // Confirm deletion
  const confirmDelete = confirm(
    `Are you sure you want to cancel and delete Appointment #${target.id} for ${target.patientName}?`
  );
  if (!confirmDelete) return;
  // Filter out the deleted record
  const updatedAppointments = appointments.filter((app) => app.id !== Number(id));
  // Save back to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAppointments));
  } catch (error) {
    console.error("Error deleting appointment from localStorage:", error);
  }
  // If the user was currently editing this same record, cancel edit mode
  if (editingAppointmentId === Number(id)) {
    cancelEditMode();
  }
  // Re-render table display
  displayAppointments(updatedAppointments);
  alert(`Appointment #${target.id} has been successfully deleted.`);
}
// ==========================================================
// 8. FORM VALIDATION & SUBMISSION (CREATE & UPDATE)
// ==========================================================
function handleAppointmentSubmit(event) {
  // Prevent default page refresh on form submit
  event.preventDefault();
  // Clear previous error messages
  clearErrors();
  // Retrieve field values
  const patientName = document.getElementById("patientName").value.trim();
  const patientAge = document.getElementById("patientAge").value.trim();
  const patientGender = document.getElementById("patientGender").value;
  const patientPhone = document.getElementById("patientPhone").value.trim();
  const patientEmail = document.getElementById("patientEmail").value.trim();
  const department = departmentSelect ? departmentSelect.value : "";
  const doctor = doctorSelect ? doctorSelect.value : "";
  const date = appointmentDate ? appointmentDate.value : "";
  const time = appointmentTime ? appointmentTime.value : "";
  const reason = document.getElementById("visitReason").value.trim();
  let isValid = true;
  // Validation 1: Patient Name
  if (patientName === "" || patientName.length < 2) {
    showError("patientNameError", "patientName", "Please enter a valid patient name (min 2 characters).");
    isValid = false;
  }
  // Validation 2: Patient Age
  const ageNum = parseInt(patientAge, 10);
  if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
    showError("patientAgeError", "patientAge", "Please enter a realistic age between 1 and 120.");
    isValid = false;
  }
  // Validation 3: Gender
  if (patientGender === "") {
    showError("patientGenderError", "patientGender", "Please select a gender.");
    isValid = false;
  }
  // Validation 4: Phone Number (10 digits)
  const phonePattern = /^[0-9]{10}$/;
  if (!phonePattern.test(patientPhone)) {
    showError("patientPhoneError", "patientPhone", "Please enter a valid 10-digit mobile number.");
    isValid = false;
  }
  // Validation 5: Email
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(patientEmail)) {
    showError("patientEmailError", "patientEmail", "Please enter a valid email address.");
    isValid = false;
  }
  // Validation 6: Department
  if (department === "") {
    showError("departmentError", "departmentSelect", "Please select a department.");
    isValid = false;
  }
  // Validation 7: Doctor
  if (doctor === "") {
    showError("doctorError", "doctorSelect", "Please select a doctor.");
    isValid = false;
  }
  // Validation 8: Appointment Date
  if (date === "") {
    showError("appointmentDateError", "appointmentDate", "Please select an appointment date.");
    isValid = false;
  } else {
    // Check if the selected date is in the past
    const selectedDateObj = new Date(date + "T00:00:00");
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);
    if (selectedDateObj < todayObj) {
      showError("appointmentDateError", "appointmentDate", "Appointment date cannot be in the past.");
      isValid = false;
    }
  }
  // Validation 9: Appointment Time
  if (time === "") {
    showError("appointmentTimeError", "appointmentTime", "Please select an appointment time slot.");
    isValid = false;
  }
  // Validation 10: Reason for visit
  if (reason === "" || reason.length < 3) {
    showError("visitReasonError", "visitReason", "Please provide a brief reason for the consultation.");
    isValid = false;
  }
  // Stop submission if any validation failed
  if (!isValid) {
    return;
  }
  // ----------------------------------------------------
  // BRANCH A: UPDATE EXISTING APPOINTMENT
  // ----------------------------------------------------
  if (editingAppointmentId !== null) {
    const updatedRecord = {
      id: editingAppointmentId,
      patientName: patientName,
      age: patientAge,
      gender: patientGender,
      phone: patientPhone,
      email: patientEmail,
      department: department,
      doctor: doctor,
      date: date,
      time: time,
      reason: reason
    };
    updateAppointmentInStorage(updatedRecord);
    // Show updated confirmation alert
    showSuccessMessage(updatedRecord, true);
    // Reset back to new booking mode
    cancelEditMode();
    if (successMessage) {
      successMessage.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
  }
  // ----------------------------------------------------
  // BRANCH B: CREATE NEW APPOINTMENT
  // ----------------------------------------------------
  const newAppointment = {
    patientName: patientName,
    age: patientAge,
    gender: patientGender,
    phone: patientPhone,
    email: patientEmail,
    department: department,
    doctor: doctor,
    date: date,
    time: time,
    reason: reason
  };
  // Save the appointment into localStorage
  const savedAppointment = saveAppointment(newAppointment);
  // Display success alert
  showSuccessMessage(savedAppointment, false);
  // Reset the form fields for subsequent bookings
  appointmentForm.reset();
  updateDoctors("");
  // Smooth scroll to the success message
  if (successMessage) {
    successMessage.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}
/**
 * Displays an error message below an invalid input and highlights the input border.
 */
function showError(errorElementId, inputElementId, message) {
  const errorEl = document.getElementById(errorElementId);
  const inputEl = document.getElementById(inputElementId);
  if (errorEl) errorEl.textContent = message;
  if (inputEl) inputEl.classList.add("is-invalid");
}
/**
 * Clears all validation errors and red input highlights.
 */
function clearErrors() {
  const errorTexts = document.querySelectorAll(".error-text");
  errorTexts.forEach((el) => (el.textContent = ""));
  const inputs = document.querySelectorAll(".is-invalid");
  inputs.forEach((el) => el.classList.remove("is-invalid"));
}
/**
 * Shows the green success notification box after booking or updating.
 */
function showSuccessMessage(appointment, isUpdate = false) {
  if (successMessage && successDetails) {
    const actionText = isUpdate ? "updated" : "confirmed";
    successDetails.innerHTML = `
      Appointment <strong>#${appointment.id}</strong> has been successfully <strong>${actionText}</strong> for
      <strong>${escapeHtml(appointment.patientName)}</strong> with 
      <strong>${escapeHtml(appointment.doctor)}</strong> (${escapeHtml(appointment.department)}) 
      on <strong>${formatDate(appointment.date)}</strong> at <strong>${escapeHtml(appointment.time)}</strong>.
    `;
    successMessage.style.display = "flex";
    // Auto-hide success message after 9 seconds
    setTimeout(() => {
      successMessage.style.display = "none";
    }, 9000);
  }
}
// ==========================================================
// 9. LOCAL STORAGE OPERATIONS
// ==========================================================
/**
 * Reads all stored appointments from browser localStorage.
 */
function getAppointmentsFromStorage() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      return [];
    }
    const parsedData = JSON.parse(rawData);
    return Array.isArray(parsedData) ? parsedData : [];
  } catch (error) {
    console.error("Error reading appointments from localStorage:", error);
    return [];
  }
}
/**
 * Saves a new appointment object into the localStorage array.
 */
function saveAppointment(appointmentData) {
  const appointments = getAppointmentsFromStorage();
  // Calculate sequential appointment number (1, 2, 3...)
  const nextNumber = appointments.length > 0 
    ? Math.max(...appointments.map(a => Number(a.id) || 0)) + 1 
    : 1;
  appointmentData.id = nextNumber;
  // Append new appointment to the bottom of the list
  appointments.push(appointmentData);
  // Save array to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
  } catch (error) {
    console.error("Error saving appointment to localStorage:", error);
  }
  // Update the dashboard table immediately
  displayAppointments(appointments);
  return appointmentData;
}
/**
 * Updates an existing appointment record in localStorage by ID.
 */
function updateAppointmentInStorage(updatedData) {
  const appointments = getAppointmentsFromStorage();
  const index = appointments.findIndex((app) => app.id === updatedData.id);
  if (index !== -1) {
    appointments[index] = updatedData;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
    } catch (error) {
      console.error("Error updating appointment in localStorage:", error);
    }
    displayAppointments(appointments);
  }
}
/**
 * Loads appointments from localStorage and displays them in the dashboard table.
 */
function loadAppointments() {
  const appointments = getAppointmentsFromStorage();
  displayAppointments(appointments);
}
// ==========================================================
// 10. DASHBOARD TABLE DISPLAY (WITH ACTIONS COLUMN)
// ==========================================================
/**
 * Renders the list of appointments into the Dashboard table body.
 * Includes Edit and Delete action buttons for each row.
 */
function displayAppointments(appointments) {
  if (!appointmentTableBody) return;
  // Clear current table rows
  appointmentTableBody.innerHTML = "";
  // If no appointments exist yet, show empty-state message row (colspan 8)
  if (!appointments || appointments.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `
      <td colspan="8" class="no-data-cell" style="text-align: center; padding: 2rem; color: #64748b;">
        No appointments booked yet. Please fill the appointment form above to book your consultation!
      </td>
    `;
    appointmentTableBody.appendChild(emptyRow);
    return;
  }
  // Loop through appointments sequentially and render table rows
  appointments.forEach((item, index) => {
    const appointmentNo = item.id || (index + 1);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>#${appointmentNo}</strong></td>
      <td>
        <strong>${escapeHtml(item.patientName)}</strong> 
        <div style="font-size: 0.8rem; color: #64748b;">(${item.gender}, ${item.age}y)</div>
      </td>
      <td><span class="table-badge">${escapeHtml(item.department)}</span></td>
      <td>${escapeHtml(item.doctor)}</td>
      <td>${formatDate(item.date)}</td>
      <td><strong>${escapeHtml(item.time)}</strong></td>
      <td>${escapeHtml(item.reason)}</td>
      <td class="action-cell">
        <button 
          type="button" 
          class="btn-table-action btn-edit" 
          onclick="handleEditAppointment(${item.id})"
          title="Update your appointment"
        >
          ✏️ Edit
        </button>
        <button 
          type="button" 
          class="btn-table-action btn-delete" 
          onclick="handleDeleteAppointment(${item.id})"
          title="Delete your appointment"
        >
          🗑️ Delete
        </button>
      </td>
    `;
    appointmentTableBody.appendChild(row);
  });
}
// ==========================================================
// 11. HELPER UTILITIES
// ==========================================================
function formatDate(dateString) {
  if (!dateString) return "-";
  const parts = dateString.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
// ==========================================================
// 12. RESPONSIVE MOBILE NAVIGATION TOGGLE
// ==========================================================
function setupMobileNavigation() {
  if (!menuToggle || !navbar) return;
  menuToggle.addEventListener("click", function () {
    navbar.classList.toggle("open");
  });
  const navLinks = document.querySelectorAll(".nav-links a");
  navLinks.forEach((link) => {
    link.addEventListener("click", function () {
      navbar.classList.remove("open");
    });
  });
}