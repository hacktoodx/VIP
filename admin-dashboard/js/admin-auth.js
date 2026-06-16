// admin-auth.js
// ระบบ Login ด้วย PIN อย่างง่าย

/**
 * ตรวจสอบว่า Login แล้วหรือยัง
 * ถ้ายัง ให้ Redirect ไปหน้า Login
 */
function requireAuth() {
  const authed = sessionStorage.getItem("admin_authed");
  if (authed !== "true") {
    showLoginModal();
  }
}

/**
 * แสดง Modal ขอ PIN
 */
function showLoginModal() {
  const overlay = document.getElementById("loginOverlay");
  if (overlay) {
    overlay.style.display = "flex";
  }
}

/**
 * ซ่อน Modal หลัง Login สำเร็จ
 */
function hideLoginModal() {
  const overlay = document.getElementById("loginOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}

/**
 * ตรวจสอบ PIN ที่กรอก
 * @param {string} inputPin
 * @return {boolean}
 */
function verifyPin(inputPin) {
  if (inputPin === ADMIN_PIN) {
    sessionStorage.setItem("admin_authed", "true");
    hideLoginModal();
    return true;
  }
  return false;
}

/**
 * Logout
 */
function logout() {
  sessionStorage.removeItem("admin_authed");
  window.location.reload();
}
