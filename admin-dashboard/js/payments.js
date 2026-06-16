// payments.js

requireAuth();

document.addEventListener("DOMContentLoaded", function () {
  if (sessionStorage.getItem("admin_authed") === "true") {
    loadPayments();
  }
});

function doLogin() {
  const pin = document.getElementById("pinInput").value;
  if (!verifyPin(pin)) {
    document.getElementById("pinError").textContent = "❌ PIN ไม่ถูกต้อง";
    document.getElementById("pinInput").value = "";
  } else {
    loadPayments();
  }
}

/**
 * โหลดรายการชำระเงินจาก Firestore ตาม filter ที่เลือก
 */
async function loadPayments() {
  const container = document.getElementById("paymentsTable");
  container.innerHTML = '<div class="loading-spinner">⏳ กำลังโหลด...</div>';

  const filterStatus = document.getElementById("filterStatus").value;

  try {
    let query = db.collection("payments").orderBy("submitted_at", "desc").limit(100);

    if (filterStatus !== "all") {
      query = db.collection("payments")
        .where("status", "==", filterStatus)
        .orderBy("submitted_at", "desc")
        .limit(100);
    }

    const snap = await query.get();

    if (snap.empty) {
      container.innerHTML = '<p class="text-muted text-center py-4">ไม่มีรายการ</p>';
      return;
    }

    let html = `<table class="table table-hover mb-0">
      <thead><tr>
        <th>สลิป</th>
        <th>User ID</th>
        <th>แพ็กเกจ</th>
        <th>ยอด</th>
        <th>วิธีชำระ</th>
        <th>สถานะ</th>
        <th>เวลาส่ง</th>
        <th>จัดการ</th>
      </tr></thead><tbody>`;

    snap.forEach(function (doc) {
      const p = doc.data();
      const docId = doc.id;
      const date = p.submitted_at?.toDate ? p.submitted_at.toDate() : new Date(p.submitted_at);
      const methodLabel = p.payment_method === "bank_transfer" ? "🏦 โอนธนาคาร" : "💰 PayPal";

      let actionButtons = "";
      if (p.status === "pending") {
        actionButtons = `
          <button class="btn btn-success btn-action me-1"
            onclick="openSlipModal('${docId}', '${p.payment_id}', '${p.slip_file_id}', true)">
            ✅ ดูและอนุมัติ
          </button>
          <button class="btn btn-danger btn-action"
            onclick="confirmReject('${p.payment_id}')">
            ❌ ปฏิเสธ
          </button>`;
      } else {
        actionButtons = `<button class="btn btn-outline-secondary btn-action"
          onclick="openSlipModal('${docId}', '${p.payment_id}', '${p.slip_file_id}', false)">
          👁 ดูสลิป
        </button>`;
      }

      html += `<tr>
        <td>
          <img src="https://via.placeholder.com/60x60?text=Slip"
            class="slip-thumb"
            onclick="openSlipModal('${docId}', '${p.payment_id}', '${p.slip_file_id}', ${p.status === "pending"})"
            title="คลิกดูสลิป" />
        </td>
        <td><code>${p.telegram_id}</code></td>
        <td>${escapeHtml(p.package_name)}</td>
        <td><strong>${p.amount} บาท</strong></td>
        <td>${methodLabel}</td>
        <td><span class="badge-status badge-${p.status}">${statusLabel(p.status)}</span></td>
        <td>${formatDate(date)}</td>
        <td>${actionButtons}</td>
      </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;

  } catch (err) {
    container.innerHTML = `<p class="text-danger p-3">เกิดข้อผิดพลาด: ${err.message}</p>`;
    console.error(err);
  }
}

/**
 * เปิด Modal ดูสลิป (แสดงรายละเอียด + ปุ่ม Approve ถ้า pending)
 * @param {string} docId - Firestore doc id
 * @param {string} paymentId
 * @param {string} slipFileId - Telegram file_id
 * @param {boolean} showApprove
 */
async function openSlipModal(docId, paymentId, slipFileId, showApprove) {
  const modal = new bootstrap.Modal(document.getElementById("slipModal"));

  // ดึงข้อมูลเพิ่มเติมจาก Firestore
  try {
    const doc = await db.collection("payments").doc(docId).get();
    const p = doc.data();

    document.getElementById("slipInfo").innerHTML = `
      <table class="table table-sm">
        <tr><td class="text-muted">Payment ID</td><td><code>${p.payment_id}</code></td></tr>
        <tr><td class="text-muted">User ID</td><td>${p.telegram_id}</td></tr>
        <tr><td class="text-muted">แพ็กเกจ</td><td>${escapeHtml(p.package_name)}</td></tr>
        <tr><td class="text-muted">ยอดเงิน</td><td><strong>${p.amount} บาท</strong></td></tr>
        <tr><td class="text-muted">วิธีชำระ</td><td>${p.payment_method === "bank_transfer" ? "โอนธนาคาร" : "PayPal"}</td></tr>
        <tr><td class="text-muted">สถานะ</td><td><span class="badge-status badge-${p.status}">${statusLabel(p.status)}</span></td></tr>
      </table>
    `;

    // หมายเหตุ: การแสดงรูปสลิปจาก Telegram file_id ต้องผ่าน GAS (ดึง URL) เนื่องจาก CORS
    // ในที่นี้ใช้ placeholder ก่อน — ในการใช้งานจริงให้เปิดลิงก์ Telegram โดยตรง
    document.getElementById("slipImage").src =
      "https://via.placeholder.com/400x300?text=Slip+ID:+" + slipFileId.substring(0, 20);

    const actionsContainer = document.getElementById("slipActions");
    if (showApprove) {
      actionsContainer.innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ปิด</button>
        <button type="button" class="btn btn-danger" onclick="confirmReject('${paymentId}');bootstrap.Modal.getInstance(document.getElementById('slipModal')).hide()">❌ ปฏิเสธ</button>
        <button type="button" class="btn btn-success" onclick="approvePayment('${paymentId}');bootstrap.Modal.getInstance(document.getElementById('slipModal')).hide()">✅ อนุมัติ</button>
      `;
    } else {
      actionsContainer.innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ปิด</button>
      `;
    }

  } catch (err) {
    console.error(err);
  }

  modal.show();
}

/**
 * ส่งคำสั่ง Approve ไปยัง GAS Web App
 * @param {string} paymentId
 */
async function approvePayment(paymentId) {
  if (!confirm("ยืนยันการอนุมัติการชำระเงิน Payment ID: " + paymentId + " ?")) return;

  showToast("⏳ กำลังอนุมัติ...", "info");

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "approve_payment",
        payment_id: paymentId,
        admin_id: ADMIN_TELEGRAM_ID
      })
    });

    const result = await response.json();

    if (result.success) {
      showToast("✅ อนุมัติสำเร็จ! ระบบส่ง Invite Link ให้ผู้ใช้แล้ว", "success");
      loadPayments();
    } else {
      showToast("❌ เกิดข้อผิดพลาด: " + (result.error || "Unknown"), "danger");
    }
  } catch (err) {
    showToast("❌ ไม่สามารถเชื่อมต่อ GAS ได้: " + err.message, "danger");
  }
}

/**
 * ยืนยันและส่งคำสั่ง Reject ไปยัง GAS Web App
 * @param {string} paymentId
 */
async function confirmReject(paymentId) {
  const note = prompt("เหตุผลที่ปฏิเสธ (optional):");
  if (note === null) return; // กด Cancel

  showToast("⏳ กำลังดำเนินการ...", "info");

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "reject_payment",
        payment_id: paymentId,
        admin_id: ADMIN_TELEGRAM_ID,
        note: note || "ปฏิเสธโดย Admin"
      })
    });

    const result = await response.json();

    if (result.success) {
      showToast("✅ ปฏิเสธเรียบร้อยแล้ว", "success");
      loadPayments();
    } else {
      showToast("❌ เกิดข้อผิดพลาด: " + (result.error || "Unknown"), "danger");
    }
  } catch (err) {
    showToast("❌ ไม่สามารถเชื่อมต่อ GAS ได้: " + err.message, "danger");
  }
}

// ==================== Helpers ====================

function statusLabel(status) {
  const map = { pending: "รอตรวจสอบ", approved: "อนุมัติแล้ว",
    rejected: "ปฏิเสธ", active: "Active", expired: "หมดอายุ" };
  return map[status] || status;
}

function formatDate(date) {
  if (!date) return "-";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${d}/${m}/${y} ${h}:${min}`;
}

function escapeHtml(text) {
  if (!text) return "";
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}

function showToast(message, type) {
  const existing = document.getElementById("toastContainer");
  if (existing) existing.remove();

  const colors = { success: "#198754", danger: "#dc3545", info: "#0d6efd" };
  const div = document.createElement("div");
  div.id = "toastContainer";
  div.style.cssText = `position:fixed;top:20px;right:20px;z-index:9999;
    background:${colors[type]||"#333"};color:#fff;padding:12px 20px;
    border-radius:10px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.2);
    max-width:320px;`;
  div.textContent = message;
  document.body.appendChild(div);
  setTimeout(function () { div.remove(); }, 4000);
}
