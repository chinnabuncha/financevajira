const API_URL = "https://script.google.com/a/macros/nmu.ac.th/s/AKfycbzvj8lMpV8ZPSGhAsXUrrznYi2dPE1VSP26HC2agGGYF_E58y6KODJ01VsLDuql3YGX/exec";

const els = {
  sendOtpBtn: document.getElementById("sendOtpBtn"),
  sendStatusOtpBtn: document.getElementById("sendStatusOtpBtn"),
  requestForm: document.getElementById("requestForm"),
  statusForm: document.getElementById("statusForm"),
  popup: document.getElementById("popup"),
  popupTitle: document.getElementById("popupTitle"),
  popupMessage: document.getElementById("popupMessage"),
  closePopupBtn: document.getElementById("closePopupBtn"),
  loading: document.getElementById("loading"),
  statusResult: document.getElementById("statusResult"),
  tabButtons: document.querySelectorAll(".tab-btn"),
  tabPanels: document.querySelectorAll(".tab-panel")
};

function showLoading() {
  els.loading.classList.remove("hidden");
}

function hideLoading() {
  els.loading.classList.add("hidden");
}

function showPopup(title, message) {
  els.popupTitle.textContent = title;
  els.popupMessage.innerHTML = message;
  els.popup.classList.remove("hidden");
}

function hidePopup() {
  els.popup.classList.add("hidden");
}

function isNmuEmail(email) {
  return /^[a-zA-Z0-9._%+-]+@nmu\.ac\.th$/i.test(String(email || "").trim());
}

async function postJSON(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error("รูปแบบข้อมูลตอบกลับไม่ถูกต้อง: " + text);
  }
}

els.closePopupBtn.addEventListener("click", hidePopup);

els.tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const tabId = btn.dataset.tab;

    els.tabButtons.forEach(b => b.classList.remove("active"));
    els.tabPanels.forEach(p => p.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(tabId).classList.add("active");
  });
});

els.sendOtpBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();

  if (!email) {
    showPopup("แจ้งเตือน", "กรุณากรอกอีเมลก่อน");
    return;
  }

  if (!isNmuEmail(email)) {
    showPopup("แจ้งเตือน", "อนุญาตเฉพาะอีเมล <strong>@nmu.ac.th</strong> เท่านั้น");
    return;
  }

  try {
    showLoading();
    const result = await postJSON({
      action: "sendOtp",
      email: email,
      purpose: "submit"
    });

    if (result.success) {
      showPopup("ส่ง OTP สำเร็จ", "ระบบได้ส่งรหัส OTP ไปยังอีเมลของท่านแล้ว<br>รหัสมีอายุ 5 นาที");
    } else {
      showPopup("ไม่สำเร็จ", result.message || "เกิดข้อผิดพลาด");
    }
  } catch (error) {
    showPopup("เกิดข้อผิดพลาด", error.message);
  } finally {
    hideLoading();
  }
});

els.sendStatusOtpBtn.addEventListener("click", async () => {
  const email = document.getElementById("statusEmail").value.trim();

  if (!email) {
    showPopup("แจ้งเตือน", "กรุณากรอกอีเมลก่อน");
    return;
  }

  if (!isNmuEmail(email)) {
    showPopup("แจ้งเตือน", "อนุญาตเฉพาะอีเมล <strong>@nmu.ac.th</strong> เท่านั้น");
    return;
  }

  try {
    showLoading();
    const result = await postJSON({
      action: "sendOtp",
      email: email,
      purpose: "status"
    });

    if (result.success) {
      showPopup("ส่ง OTP สำเร็จ", "ระบบได้ส่งรหัส OTP สำหรับตรวจสอบสถานะไปยังอีเมลของท่านแล้ว");
    } else {
      showPopup("ไม่สำเร็จ", result.message || "เกิดข้อผิดพลาด");
    }
  } catch (error) {
    showPopup("เกิดข้อผิดพลาด", error.message);
  } finally {
    hideLoading();
  }
});

els.requestForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    action: "verifyOtpAndSubmit",
    email: document.getElementById("email").value.trim(),
    otp: document.getElementById("otp").value.trim(),
    sendSystem: document.getElementById("sendSystem").value.trim(),
    titleName: document.getElementById("titleName").value.trim(),
    fullName: document.getElementById("fullName").value.trim(),
    gender: document.getElementById("gender").value.trim(),
    division: document.getElementById("division").value.trim(),
    department: document.getElementById("department").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    question: document.getElementById("question").value.trim(),
    detail: document.getElementById("detail").value.trim()
  };

  if (!isNmuEmail(payload.email)) {
    showPopup("แจ้งเตือน", "กรุณาใช้อีเมล <strong>@nmu.ac.th</strong>");
    return;
  }

  if (!payload.otp) {
    showPopup("แจ้งเตือน", "กรุณากรอก OTP");
    return;
  }

  if (!payload.fullName || !payload.question) {
    showPopup("แจ้งเตือน", "กรุณากรอกข้อมูลที่จำเป็นให้ครบ");
    return;
  }

  try {
    showLoading();
    const result = await postJSON(payload);

    if (result.success) {
      showPopup(
        "ส่งคำร้องสำเร็จ",
        `เลข Ticket ของท่านคือ<br><strong style="font-size:1.2rem;">${result.ticketId}</strong><br><br>ระบบได้บันทึกคำร้องเรียบร้อยแล้ว`
      );

      els.requestForm.reset();
    } else {
      showPopup("ไม่สำเร็จ", result.message || "เกิดข้อผิดพลาด");
    }
  } catch (error) {
    showPopup("เกิดข้อผิดพลาด", error.message);
  } finally {
    hideLoading();
  }
});

els.statusForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    action: "verifyOtpAndCheckStatus",
    email: document.getElementById("statusEmail").value.trim(),
    otp: document.getElementById("statusOtp").value.trim(),
    ticketId: document.getElementById("ticketId").value.trim()
  };

  if (!isNmuEmail(payload.email)) {
    showPopup("แจ้งเตือน", "กรุณาใช้อีเมล <strong>@nmu.ac.th</strong>");
    return;
  }

  if (!payload.otp || !payload.ticketId) {
    showPopup("แจ้งเตือน", "กรุณากรอกข้อมูลให้ครบ");
    return;
  }

  try {
    showLoading();
    const result = await postJSON(payload);

    if (result.success) {
      const d = result.data || {};
      els.statusResult.innerHTML = `
        <div class="status-item"><strong>เลข Ticket:</strong> ${escapeHtml(d.ticketId || "-")}</div>
        <div class="status-item"><strong>ชื่อ-นามสกุล:</strong> ${escapeHtml(d.fullName || "-")}</div>
        <div class="status-item"><strong>คำถาม/ข้อสงสัย:</strong> ${escapeHtml(d.question || "-")}</div>
        <div class="status-item"><strong>สถานะ:</strong> ${escapeHtml(d.status || "-")}</div>
        <div class="status-item"><strong>ผู้รับผิดชอบ:</strong> ${escapeHtml(d.assignee || "-")}</div>
        <div class="status-item"><strong>เบอร์ติดต่อผู้รับผิดชอบ:</strong> ${escapeHtml(d.assigneePhone || "-")}</div>
        <div class="status-item"><strong>วันที่รับเรื่อง:</strong> ${escapeHtml(d.thaiDate || "-")}</div>
      `;
      els.statusResult.classList.remove("hidden");
    } else {
      els.statusResult.classList.add("hidden");
      showPopup("ไม่พบข้อมูล", result.message || "ไม่พบ Ticket นี้");
    }
  } catch (error) {
    showPopup("เกิดข้อผิดพลาด", error.message);
  } finally {
    hideLoading();
  }
});

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}