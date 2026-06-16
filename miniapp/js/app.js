// app.js - Home Page Logic

// Initialize Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// ดึงข้อมูลผู้ใช้จาก Telegram initData
const tgUser = tg.initDataUnsafe?.user;

document.addEventListener("DOMContentLoaded", function () {
  if (!tgUser || !tgUser.id) {
    document.getElementById("membershipStatus").innerHTML =
      '<div class="card"><div class="card-title">⚠️ ไม่พบข้อมูลผู้ใช้</div>' +
      '<div class="card-subtitle">กรุณาเปิดแอปนี้ผ่าน Telegram Bot เท่านั้น</div></div>';
    return;
  }

  loadMembershipStatus(tgUser.id);

  document.getElementById("btnSelectPackage").addEventListener("click", function () {
    window.location.href = "packages.html";
  });
});

/**
 * ตรวจสอบสถานะสมาชิกปัจจุบันของผู้ใช้จาก Firestore
 * แสดงผลเป็น card ด้านบนของหน้า Home
 * @param {number} telegramId
 */
async function loadMembershipStatus(telegramId) {
  const statusContainer = document.getElementById("membershipStatus");
  statusContainer.innerHTML = '<div class="loading">⏳ กำลังโหลดข้อมูล...</div>';

  try {
    const snapshot = await db.collection("memberships")
      .where("telegram_id", "==", telegramId)
      .where("status", "==", "active")
      .orderBy("expire_date", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      statusContainer.innerHTML = "";
      return;
    }

    const membership = snapshot.docs[0].data();
    const expireDate = membership.expire_date.toDate
      ? membership.expire_date.toDate()
      : new Date(membership.expire_date);

    const formattedDate = formatDate(expireDate);

    statusContainer.innerHTML = `
      <div class="card">
        <div class="card-title">✅ สมาชิกของคุณ <span class="badge badge-active">Active</span></div>
        <div class="info-box" style="margin-top:8px;">
          <div class="row"><span class="label">แพ็กเกจ</span><span class="value">${escapeHtml(membership.package_name)}</span></div>
          <div class="row"><span class="label">หมดอายุ</span><span class="value">${formattedDate}</span></div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error("Error loading membership:", err);
    statusContainer.innerHTML = "";
  }
}

/**
 * Format Date เป็น DD/MM/YYYY
 * @param {Date} date
 * @return {string}
 */
function formatDate(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Escape HTML characters
 * @param {string} text
 * @return {string}
 */
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
