// upload-slip.js - Upload Slip Page Logic
//
// ✅ สิ่งที่แก้ไข:
// 1. เพิ่มฟิลด์ input "หมายเหตุ" (note) ในหน้าและส่งไปพร้อม payload
// 2. เพิ่มส่ง last_name ไปกับ payload
// 3. รับข้อมูลกลับจาก GAS (payment_id, package_name, amount, submitted_at)
//    แล้วบันทึกลง sessionStorage เพื่อแสดงหน้าสรุปใน success.html
// 4. ไม่ redirect ไป success.html แบบ blind — ส่งข้อมูลไปด้วย

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const tgUser = tg.initDataUnsafe?.user;
let selectedPackage    = null;
let selectedMethod     = null;
let selectedFile       = null;
let selectedFileBase64 = null;

document.addEventListener("DOMContentLoaded", function () {
  // โหลดข้อมูลที่เลือกไว้จากหน้าก่อนหน้า
  const pkgStored    = sessionStorage.getItem("selected_package");
  const methodStored = sessionStorage.getItem("selected_payment_method");

  if (!pkgStored || !methodStored) {
    tg.showAlert("ข้อมูลไม่ครบถ้วน กรุณาเริ่มใหม่");
    window.location.href = "packages.html";
    return;
  }

  selectedPackage = JSON.parse(pkgStored);
  selectedMethod  = methodStored;

  // แสดงสรุปรายการด้านบน
  document.getElementById("orderSummary").textContent =
    selectedPackage.name + " - " + selectedPackage.price + " บาท (" + methodLabel(selectedMethod) + ")";

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

  // ตรวจสอบประเภทไฟล์
  if (!file.type.startsWith("image/")) {
    tg.showAlert("กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG)");
    return;
  }

  // ตรวจสอบขนาดไฟล์ (ไม่เกิน 10MB)
  if (file.size > 10 * 1024 * 1024) {
    tg.showAlert("ไฟล์ขนาดใหญ่เกินไป กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 10MB");
    return;
  }

  selectedFile = file;

  const reader = new FileReader();
  reader.onload = function (e) {
    selectedFileBase64 = e.target.result; // data:image/jpeg;base64,xxxx

    // แสดง preview รูป
    document.getElementById("uploadPlaceholder").style.display = "none";
    const img = document.getElementById("previewImage");
    img.src   = selectedFileBase64;
    img.style.display = "block";

    // เปิดปุ่มส่ง
    const btn      = document.getElementById("btnSubmit");
    btn.disabled   = false;
    btn.textContent = "✅ ยืนยันส่งสลิป";
  };
  reader.readAsDataURL(file);
}

/**
 * ✅ แก้ไข: ส่งสลิปไปยัง GAS Web App พร้อมข้อมูลครบถ้วน
 * - เพิ่ม last_name จาก Telegram user
 * - เพิ่ม note (หมายเหตุ) จาก input
 * - รับข้อมูลกลับจาก GAS แล้วเก็บไว้ใน sessionStorage
 *   เพื่อให้ success.html นำไปแสดงหน้าสรุป
 */
async function submitPayment() {
  if (!selectedFileBase64) {
    tg.showAlert("กรุณาแนบสลิปการชำระเงินก่อน");
    return;
  }

  if (!tgUser) {
    tg.showAlert("ไม่พบข้อมูลผู้ใช้ กรุณาเปิดแอปนี้ผ่าน Telegram Bot เท่านั้น");
    return;
  }

  const btn      = document.getElementById("btnSubmit");
  btn.disabled   = true;
  btn.textContent = "⏳ กำลังส่งข้อมูล...";

  try {
    // ตัด prefix "data:image/jpeg;base64," ออก เอาเฉพาะส่วน base64
    const base64Data = selectedFileBase64.split(",")[1];

    // ✅ เพิ่ม: อ่านหมายเหตุจาก input (ถ้ามี)
    const noteInput = document.getElementById("noteInput");
    const note      = noteInput ? noteInput.value.trim() : "";

    const payload = {
      action:         "submit_payment",
      telegram_id:    tgUser.id,
      username:       tgUser.username   || "",
      first_name:     tgUser.first_name || "",
      last_name:      tgUser.last_name  || "",   // ✅ เพิ่ม
      package_id:     selectedPackage.package_id,
      package_name:   selectedPackage.name,
      amount:         selectedPackage.price,
      duration_days:  selectedPackage.duration_days,
      payment_method: selectedMethod,
      slip_base64:    base64Data,
      mime_type:      selectedFile.type,
      note:           note                        // ✅ เพิ่ม
    };

    const response = await fetch(GAS_WEB_APP_URL, {
      method:  "POST",
      headers: { "Content-Type": "text/plain" }, // text/plain หลีกเลี่ยง CORS preflight บน GAS
      body:    JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.success) {
      // ✅ เพิ่ม: เก็บข้อมูลสรุปไว้ใน sessionStorage เพื่อแสดงใน success.html
      const summaryData = {
        payment_id:   result.payment_id   || "",
        package_name: result.package_name || selectedPackage.name,
        amount:       result.amount       || selectedPackage.price,
        submitted_at: result.submitted_at || new Date().toISOString(),
        status:       result.status       || "pending",
        payment_method: selectedMethod
      };
      sessionStorage.setItem("payment_summary", JSON.stringify(summaryData));

      // ล้างข้อมูล session ที่ไม่ต้องการแล้ว
      sessionStorage.removeItem("selected_package");
      sessionStorage.removeItem("selected_payment_method");

      // ไปหน้าสรุป
      window.location.href = "success.html";

    } else {
      tg.showAlert("เกิดข้อผิดพลาด: " + (result.error || "ไม่สามารถส่งข้อมูลได้"));
      btn.disabled    = false;
      btn.textContent = "✅ ยืนยันส่งสลิป";
    }

  } catch (err) {
    console.error("Error submitting payment:", err);
    tg.showAlert("เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่");
    btn.disabled    = false;
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
