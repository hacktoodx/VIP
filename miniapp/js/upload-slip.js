// upload-slip.js - Upload Slip Page Logic

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const tgUser = tg.initDataUnsafe?.user;
let selectedPackage = null;
let selectedMethod = null;
let selectedFile = null;
let selectedFileBase64 = null;

document.addEventListener("DOMContentLoaded", function () {
  // โหลดข้อมูลจากหน้าก่อนหน้า
  const pkgStored = sessionStorage.getItem("selected_package");
  const methodStored = sessionStorage.getItem("selected_payment_method");

  if (!pkgStored || !methodStored) {
    alert("ข้อมูลไม่ครบถ้วน กรุณาเริ่มใหม่");
    window.location.href = "packages.html";
    return;
  }

  selectedPackage = JSON.parse(pkgStored);
  selectedMethod = methodStored;

  document.getElementById("orderSummary").textContent =
    `${selectedPackage.name} - ${selectedPackage.price} บาท (${methodLabel(selectedMethod)})`;

  // เปิด File picker เมื่อคลิกที่ upload box
  document.getElementById("uploadBox").addEventListener("click", function () {
    document.getElementById("fileInput").click();
  });

  document.getElementById("fileInput").addEventListener("change", handleFileSelect);

  document.getElementById("btnSubmit").addEventListener("click", submitPayment);
});

/**
 * แปลงไฟล์ที่เลือกเป็น Base64 และแสดง preview
 * @param {Event} event
 */
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  selectedFile = file;

  const reader = new FileReader();
  reader.onload = function (e) {
    selectedFileBase64 = e.target.result; // data:image/jpeg;base64,xxxx

    document.getElementById("uploadPlaceholder").style.display = "none";
    const img = document.getElementById("previewImage");
    img.src = selectedFileBase64;
    img.style.display = "block";

    const btn = document.getElementById("btnSubmit");
    btn.disabled = false;
    btn.textContent = "✅ ยืนยันส่งสลิป";
  };
  reader.readAsDataURL(file);
}

/**
 * ส่งสลิปไปยัง GAS Web App เพื่อ:
 * 1. Upload รูปไปยัง Telegram (sendPhoto ไปที่ Admin) -> ได้ file_id + URL
 * 2. บันทึก record ใน Firestore collection "payments"
 * 3. ส่ง Notification พร้อมปุ่ม Approve/Reject ไปยัง Admin ทุกคน
 */
async function submitPayment() {
  if (!selectedFileBase64 || !tgUser) {
    tg.showAlert("ข้อมูลไม่ครบถ้วน กรุณาลองใหม่");
    return;
  }

  const btn = document.getElementById("btnSubmit");
  btn.disabled = true;
  btn.textContent = "⏳ กำลังส่งข้อมูล...";

  try {
    // เอาเฉพาะส่วน base64 (ตัด prefix "data:image/jpeg;base64,")
    const base64Data = selectedFileBase64.split(",")[1];

    const payload = {
      action: "submit_payment",
      telegram_id: tgUser.id,
      username: tgUser.username || "",
      first_name: tgUser.first_name || "",
      package_id: selectedPackage.package_id,
      package_name: selectedPackage.name,
      amount: selectedPackage.price,
      duration_days: selectedPackage.duration_days,
      payment_method: selectedMethod,
      slip_base64: base64Data,
      mime_type: selectedFile.type
    };

    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" }, // ใช้ text/plain เพื่อหลีกเลี่ยง CORS preflight บน GAS
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.success) {
      // ล้างข้อมูล session หลังส่งสำเร็จ
      sessionStorage.removeItem("selected_package");
      sessionStorage.removeItem("selected_payment_method");
      window.location.href = "success.html";
    } else {
      tg.showAlert("เกิดข้อผิดพลาด: " + (result.error || "ไม่สามารถส่งข้อมูลได้"));
      btn.disabled = false;
      btn.textContent = "✅ ยืนยันส่งสลิป";
    }
  } catch (err) {
    console.error("Error submitting payment:", err);
    tg.showAlert("เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่");
    btn.disabled = false;
    btn.textContent = "✅ ยืนยันส่งสลิป";
  }
}

/**
 * แปลง method code เป็นข้อความที่อ่านง่าย
 * @param {string} method
 * @return {string}
 */
function methodLabel(method) {
  return method === "bank_transfer" ? "โอนธนาคาร" : "PayPal";
}
