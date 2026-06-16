// packages.js - Package Selection Page Logic

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

let selectedPackage = null;
let allPackages = [];

document.addEventListener("DOMContentLoaded", function () {
  loadPackages();

  document.getElementById("btnNext").addEventListener("click", function () {
    if (!selectedPackage) return;

    // บันทึกแพ็กเกจที่เลือกไว้ใน sessionStorage เพื่อใช้ในหน้าถัดไป
    sessionStorage.setItem("selected_package", JSON.stringify(selectedPackage));
    window.location.href = "payment.html";
  });
});

/**
 * โหลดรายการแพ็กเกจจาก Firestore document: settings/packages
 */
async function loadPackages() {
  const container = document.getElementById("packageList");

  try {
    const doc = await db.collection("settings").doc("packages").get();

    if (!doc.exists) {
      container.innerHTML = '<div class="card">⚠️ ไม่พบข้อมูลแพ็กเกจ</div>';
      return;
    }

    const data = doc.data();
    allPackages = data.list || [];

    if (allPackages.length === 0) {
      container.innerHTML = '<div class="card">⚠️ ยังไม่มีแพ็กเกจในขณะนี้</div>';
      return;
    }

    renderPackages();
  } catch (err) {
    console.error("Error loading packages:", err);
    container.innerHTML = '<div class="card">❌ เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
  }
}

/**
 * แสดงรายการแพ็กเกจเป็น Card ที่กดเลือกได้
 */
function renderPackages() {
  const container = document.getElementById("packageList");
  container.innerHTML = "";

  allPackages.forEach(function (pkg, index) {
    const card = document.createElement("div");
    card.className = "package-card";
    card.dataset.index = index;

    card.innerHTML = `
      <div class="package-name">${escapeHtml(pkg.name)}</div>
      <div class="package-duration">⏱ ระยะเวลา ${pkg.duration_days} วัน</div>
      <div class="package-price">${pkg.price} บาท</div>
      <div class="package-desc">${escapeHtml(pkg.description)}</div>
    `;

    card.addEventListener("click", function () {
      selectPackage(index);
    });

    container.appendChild(card);
  });
}

/**
 * เลือกแพ็กเกจ (highlight card ที่เลือกและเปิดปุ่ม Next)
 * @param {number} index
 */
function selectPackage(index) {
  selectedPackage = allPackages[index];

  // ลบ class selected จากทุก card
  document.querySelectorAll(".package-card").forEach(function (el) {
    el.classList.remove("selected");
  });

  // เพิ่ม class selected ให้ card ที่ถูกเลือก
  document.querySelector(`.package-card[data-index="${index}"]`).classList.add("selected");

  const btn = document.getElementById("btnNext");
  btn.disabled = false;
  btn.textContent = `ดำเนินการต่อ - ${selectedPackage.name}`;
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
