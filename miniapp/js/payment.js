// payment.js - Payment Method Selection Page Logic

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

let selectedPackage = null;
let selectedMethod = null;
let paymentMethodsData = null;

document.addEventListener("DOMContentLoaded", function () {
  // โหลดแพ็กเกจที่เลือกไว้จากหน้าก่อนหน้า
  const stored = sessionStorage.getItem("selected_package");
  if (!stored) {
    alert("กรุณาเลือกแพ็กเกจก่อน");
    window.location.href = "packages.html";
    return;
  }

  selectedPackage = JSON.parse(stored);
  document.getElementById("orderSummary").textContent =
    `${selectedPackage.name} - ${selectedPackage.price} บาท`;

  loadPaymentMethods();

  document.getElementById("btnNext").addEventListener("click", function () {
    if (!selectedMethod) return;

    // บันทึกวิธีชำระเงินที่เลือก
    sessionStorage.setItem("selected_payment_method", selectedMethod);
    window.location.href = "upload-slip.html";
  });
});

/**
 * โหลดข้อมูลช่องทางชำระเงินจาก Firestore: settings/payment_methods
 */
async function loadPaymentMethods() {
  const container = document.getElementById("paymentMethods");

  try {
    const doc = await db.collection("settings").doc("payment_methods").get();

    if (!doc.exists) {
      container.innerHTML = '<div class="card">⚠️ ไม่พบข้อมูลช่องทางชำระเงิน</div>';
      return;
    }

    paymentMethodsData = doc.data();
    renderPaymentMethods();
  } catch (err) {
    console.error("Error loading payment methods:", err);
    container.innerHTML = '<div class="card">❌ เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
  }
}

/**
 * แสดงรายการวิธีชำระเงินที่เปิดใช้งาน
 */
function renderPaymentMethods() {
  const container = document.getElementById("paymentMethods");
  container.innerHTML = "";

  if (paymentMethodsData.bank_transfer && paymentMethodsData.bank_transfer.enabled) {
    const el = document.createElement("div");
    el.className = "payment-method";
    el.dataset.method = "bank_transfer";
    el.innerHTML = `
      <div class="icon">🏦</div>
      <div class="info">
        <div class="name">โอนธนาคาร</div>
        <div class="detail">${escapeHtml(paymentMethodsData.bank_transfer.bank_name)}</div>
      </div>
    `;
    el.addEventListener("click", function () {
      selectMethod("bank_transfer", el);
    });
    container.appendChild(el);
  }

  if (paymentMethodsData.paypal && paymentMethodsData.paypal.enabled) {
    const el = document.createElement("div");
    el.className = "payment-method";
    el.dataset.method = "paypal";
    el.innerHTML = `
      <div class="icon">💰</div>
      <div class="info">
        <div class="name">PayPal</div>
        <div class="detail">${escapeHtml(paymentMethodsData.paypal.paypal_email)}</div>
      </div>
    `;
    el.addEventListener("click", function () {
      selectMethod("paypal", el);
    });
    container.appendChild(el);
  }
}

/**
 * เลือกวิธีชำระเงิน และแสดงรายละเอียดบัญชีด้านล่าง
 * @param {string} method - "bank_transfer" หรือ "paypal"
 * @param {HTMLElement} el - element ที่ถูกคลิก
 */
function selectMethod(method, el) {
  selectedMethod = method;

  document.querySelectorAll(".payment-method").forEach(function (item) {
    item.classList.remove("selected");
  });
  el.classList.add("selected");

  const detailContainer = document.getElementById("paymentDetail");

  if (method === "bank_transfer") {
    const bank = paymentMethodsData.bank_transfer;
    detailContainer.innerHTML = `
      <div class="info-box">
        <div class="row"><span class="label">ธนาคาร</span><span class="value">${escapeHtml(bank.bank_name)}</span></div>
        <div class="row"><span class="label">ชื่อบัญชี</span><span class="value">${escapeHtml(bank.account_name)}</span></div>
        <div class="row"><span class="label">เลขบัญชี</span><span class="value">${escapeHtml(bank.account_number)}
          <button class="copy-btn" onclick="copyText('${bank.account_number}')">คัดลอก</button>
        </span></div>
        <div class="row"><span class="label">พร้อมเพย์</span><span class="value">${escapeHtml(bank.promptpay || "-")}</span></div>
        <div class="row"><span class="label">ยอดที่ต้องโอน</span><span class="value">${selectedPackage.price} บาท</span></div>
      </div>
    `;
  } else if (method === "paypal") {
    const paypal = paymentMethodsData.paypal;
    detailContainer.innerHTML = `
      <div class="info-box">
        <div class="row"><span class="label">PayPal Email</span><span class="value">${escapeHtml(paypal.paypal_email)}</span></div>
        <div class="row"><span class="label">ลิงก์ชำระเงิน</span><span class="value"><a href="${escapeHtml(paypal.paypal_link)}" target="_blank">เปิดลิงก์</a></span></div>
        <div class="row"><span class="label">ยอดที่ต้องโอน</span><span class="value">${selectedPackage.price} บาท</span></div>
      </div>
    `;
  }

  const btn = document.getElementById("btnNext");
  btn.disabled = false;
  btn.textContent = "ดำเนินการต่อ - แนบสลิป";
}

/**
 * คัดลอกข้อความ (เลขบัญชี) ไปยัง Clipboard
 * @param {string} text
 */
function copyText(text) {
  navigator.clipboard.writeText(text).then(function () {
    tg.showAlert("คัดลอกแล้ว: " + text);
  });
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
