// broadcast.js

requireAuth();

document.addEventListener("DOMContentLoaded", function () {
  if (sessionStorage.getItem("admin_authed") === "true") {
    loadBroadcastHistory();
  }

  // Live preview ข้อความ
  document.getElementById("broadcastMessage").addEventListener("input", function () {
    document.getElementById("messagePreview").innerHTML =
      this.value.replace(/\n/g, "<br>");
  });
});

function doLogin() {
  const pin = document.getElementById("pinInput").value;
  if (!verifyPin(pin)) {
    document.getElementById("pinError").textContent = "❌ PIN ไม่ถูกต้อง";
    document.getElementById("pinInput").value = "";
  } else {
    loadBroadcastHistory();
  }
}

/**
 * ส่ง Broadcast ผ่าน GAS
 */
async function sendBroadcast() {
  const message = document.getElementById("broadcastMessage").value.trim();
  const target = document.getElementById("broadcastTarget").value;

  if (!message) {
    alert("กรุณากรอกข้อความก่อนส่ง");
    return;
  }

  const targetLabels = {
    all: "ผู้ใช้ทั้งหมด",
    active_members: "สมาชิก Active",
    expired: "สมาชิกที่หมดอายุ"
  };

  if (!confirm(`ยืนยันส่งข้อความไปยัง: ${targetLabels[target]}\n\n"${message.substring(0, 100)}${message.length > 100 ? "..." : ""}"`)) {
    return;
  }

  const btn = document.getElementById("btnSendBroadcast");
  btn.disabled = true;
  btn.textContent = "⏳ กำลังส่ง...";

  const resultDiv = document.getElementById("broadcastResult");
  resultDiv.innerHTML = '<div class="alert alert-info">⏳ กำลังส่งข้อความ อาจใช้เวลาสักครู่...</div>';

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "send_broadcast",
        message: message,
        target: target,
        admin_id: ADMIN_TELEGRAM_ID
      })
    });

    const result = await response.json();

    if (result.success) {
      resultDiv.innerHTML = `
        <div class="alert alert-success">
          ✅ ส่งสำเร็จ!<br>
          ส่งสำเร็จ: <strong>${result.total_sent}</strong> คน |
          ส่งไม่สำเร็จ: <strong>${result.total_failed}</strong> คน
        </div>`;
      document.getElementById("broadcastMessage").value = "";
      document.getElementById("messagePreview").innerHTML = "";
      loadBroadcastHistory();
    } else {
      resultDiv.innerHTML = `<div class="alert alert-danger">❌ เกิดข้อผิดพลาด: ${result.error || "Unknown"}</div>`;
    }
  } catch (err) {
    resultDiv.innerHTML = `<div class="alert alert-danger">❌ ไม่สามารถเชื่อมต่อ GAS: ${err.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "📢 ส่ง Broadcast";
  }
}

/**
 * โหลดประวัติการส่ง Broadcast จาก Firestore
 */
async function loadBroadcastHistory() {
  const container = document.getElementById("broadcastHistory");
  container.innerHTML = '<div class="loading-spinner">⏳ กำลังโหลด...</div>';

  try {
    const snap = await db.collection("broadcasts")
      .orderBy("sent_at", "desc").limit(20).get();

    if (snap.empty) {
      container.innerHTML = '<p class="text-muted text-center py-3">ยังไม่มีประวัติการส่ง</p>';
      return;
    }

    let html = `<table class="table table-hover mb-0">
      <thead><tr>
        <th>เวลาส่ง</th>
        <th>กลุ่มเป้าหมาย</th>
        <th>ข้อความ</th>
        <th>ส่งสำเร็จ</th>
        <th>สถานะ</th>
      </tr></thead><tbody>`;

    snap.forEach(function (doc) {
      const b = doc.data();
      const sentAt = b.sent_at?.toDate ? b.sent_at.toDate() : new Date(b.sent_at);
      const targetMap = { all: "ทั้งหมด", active_members: "สมาชิก Active", expired: "หมดอายุ" };

      html += `<tr>
        <td>${formatDate(sentAt)}</td>
        <td>${targetMap[b.target] || b.target}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          ${escapeHtml(b.message)}
        </td>
        <td>${b.total_sent || 0} / ${(b.total_sent || 0) + (b.total_failed || 0)}</td>
        <td><span class="badge-status badge-${b.status === "completed" ? "active" : "pending"}">${b.status}</span></td>
      </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;

  } catch (err) {
    container.innerHTML = `<p class="text-danger p-3">เกิดข้อผิดพลาด: ${err.message}</p>`;
  }
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
