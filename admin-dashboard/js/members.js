// members.js

requireAuth();

let packagesCache = [];

document.addEventListener("DOMContentLoaded", function () {
  if (sessionStorage.getItem("admin_authed") === "true") {
    loadPackagesCache().then(loadMembers);
  }
});

function doLogin() {
  const pin = document.getElementById("pinInput").value;
  if (!verifyPin(pin)) {
    document.getElementById("pinError").textContent = "❌ PIN ไม่ถูกต้อง";
    document.getElementById("pinInput").value = "";
  } else {
    loadPackagesCache().then(loadMembers);
  }
}

async function loadPackagesCache() {
  try {
    const doc = await db.collection("settings").doc("packages").get();
    if (doc.exists) {
      packagesCache = doc.data().list || [];
    }
  } catch (err) {
    console.error("loadPackagesCache error:", err);
  }
}

async function loadMembers() {
  const container = document.getElementById("membersTable");
  container.innerHTML = '<div class="loading-spinner">⏳ กำลังโหลด...</div>';

  const filterStatus = document.getElementById("filterStatus").value;

  try {
    let query;
    if (filterStatus === "all") {
      query = db.collection("memberships").orderBy("created_at", "desc").limit(200);
    } else {
      query = db.collection("memberships")
        .where("status", "==", filterStatus)
        .orderBy("expire_date", "asc")
        .limit(200);
    }

    const snap = await query.get();

    if (snap.empty) {
      container.innerHTML = '<p class="text-muted text-center py-4">ไม่มีข้อมูลสมาชิก</p>';
      return;
    }

    let html = `<table class="table table-hover mb-0">
      <thead><tr>
        <th>User ID</th>
        <th>แพ็กเกจ</th>
        <th>ราคา</th>
        <th>เริ่มต้น</th>
        <th>หมดอายุ</th>
        <th>สถานะ</th>
        <th>จัดการ</th>
      </tr></thead><tbody>`;

    snap.forEach(function (doc) {
      const m = doc.data();
      const startDate = m.start_date?.toDate ? m.start_date.toDate() : new Date(m.start_date);
      const expDate = m.expire_date?.toDate ? m.expire_date.toDate() : new Date(m.expire_date);

      html += `<tr>
        <td><code>${m.telegram_id}</code></td>
        <td>${escapeHtml(m.package_name)}</td>
        <td>${m.price} บาท</td>
        <td>${formatDate(startDate)}</td>
        <td class="${m.status === "active" ? "" : "text-danger"}">${formatDate(expDate)}</td>
        <td><span class="badge-status badge-${m.status}">${statusLabel(m.status)}</span></td>
        <td>
          <button class="btn btn-primary btn-action"
            onclick="openRenewModal(${m.telegram_id})">
            🔄 ต่ออายุ
          </button>
        </td>
      </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;

  } catch (err) {
    container.innerHTML = `<p class="text-danger p-3">เกิดข้อผิดพลาด: ${err.message}</p>`;
  }
}

/**
 * เปิด Dialog ต่ออายุสมาชิก
 * @param {number} telegramId
 */
function openRenewModal(telegramId) {
  if (packagesCache.length === 0) {
    alert("ไม่พบข้อมูลแพ็กเกจ กรุณารีเฟรชหน้าใหม่");
    return;
  }

  let pkgOptions = packagesCache.map(function (p) {
    return `${p.package_id}|${p.name} (${p.duration_days} วัน - ${p.price} บาท)`;
  }).join("\n");

  const choice = prompt(
    `ต่ออายุสมาชิก User ID: ${telegramId}\n\nเลือกแพ็กเกจ (กรอก ID):\n` +
    packagesCache.map(function (p) {
      return `${p.package_id} = ${p.name} (${p.price} บาท)`;
    }).join("\n")
  );

  if (!choice) return;

  const selectedPkg = packagesCache.find(function (p) { return p.package_id === choice.trim(); });
  if (!selectedPkg) {
    alert("ไม่พบแพ็กเกจ ID: " + choice);
    return;
  }

  renewMembership(telegramId, selectedPkg.package_id);
}

/**
 * ส่งคำสั่งต่ออายุไปยัง GAS
 * @param {number} telegramId
 * @param {string} packageId
 */
async function renewMembership(telegramId, packageId) {
  showToast("⏳ กำลังต่ออายุ...", "info");

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "renew_membership",
        telegram_id: telegramId,
        package_id: packageId,
        admin_id: ADMIN_TELEGRAM_ID
      })
    });

    const result = await response.json();

    if (result.success) {
      showToast("✅ ต่ออายุสำเร็จ! ส่ง Invite Link ให้ผู้ใช้แล้ว", "success");
      loadMembers();
    } else {
      showToast("❌ เกิดข้อผิดพลาด: " + (result.error || "Unknown"), "danger");
    }
  } catch (err) {
    showToast("❌ ไม่สามารถเชื่อมต่อ GAS ได้: " + err.message, "danger");
  }
}

/**
 * Export CSV ผ่าน GAS
 */
async function exportCsv() {
  showToast("⏳ กำลัง Export...", "info");

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "export_csv",
        admin_id: ADMIN_TELEGRAM_ID
      })
    });

    const result = await response.json();

    if (result.success && result.csv) {
      const blob = new Blob(["\uFEFF" + result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "members_" + formatDateFilename(new Date()) + ".csv";
      link.click();
      URL.revokeObjectURL(url);
      showToast("✅ Export สำเร็จ!", "success");
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
  return `${d}/${m}/${y}`;
}

function formatDateFilename(date) {
  return date.getFullYear() + String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0");
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
    background:${colors[type] || "#333"};color:#fff;padding:12px 20px;
    border-radius:10px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.2);max-width:320px;`;
  div.textContent = message;
  document.body.appendChild(div);
  setTimeout(function () { div.remove(); }, 4000);
}
