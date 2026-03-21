const API_URL = 'https://script.google.com/a/macros/nmu.ac.th/s/AKfycbzvj8lMpV8ZPSGhAsXUrrznYi2dPE1VSP26HC2agGGYF_E58y6KODJ01VsLDuql3YGX/exec';

let currentRequestId = '';
let verifiedRequestId = '';
let verifiedEmail = '';
let closeAlertAction = 'close';
let isBusy = false;

const MAX_FILE_SIZE_MB = 5;
const MAX_TOTAL_SIZE_MB = 15;

function $(id) {
  return document.getElementById(id);
}

function esc(v) {
  return String(v || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function api(action, payload = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify({
      action,
      ...payload
    })
  });

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error('API ตอบกลับไม่ถูกต้อง: ' + text);
  }
}

function setLoading(isLoading, text) {
  isBusy = !!isLoading;
  $('loadingOverlay').style.display = isLoading ? 'flex' : 'none';
  $('loadingText').textContent = text || 'กำลังดำเนินการ...';
  $('otpBtn').disabled = isLoading;
  $('submitBtn').disabled = isLoading;
}

function getGender() {
  const checked = document.querySelector('input[name="gender"]:checked');
  return checked ? checked.value : '';
}

function fillSelectOptions(selectId, items, placeholder) {
  const select = $(selectId);
  const frag = document.createDocumentFragment();

  const first = document.createElement('option');
  first.value = '';
  first.textContent = placeholder;
  frag.appendChild(first);

  (items || []).forEach(function(item) {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    frag.appendChild(opt);
  });

  select.innerHTML = '';
  select.appendChild(frag);
}

function showAlertPopup(type, title, message, extraHtml, action) {
  closeAlertAction = action || 'close';

  const icon = $('alertIcon');
  if (type === 'error') {
    icon.className = 'alert-icon alert-error';
    icon.textContent = '!';
  } else {
    icon.className = 'alert-icon alert-success';
    icon.textContent = '✓';
  }

  $('alertTitle').textContent = title || 'แจ้งเตือน';
  $('alertMessage').textContent = message || '';
  $('alertExtra').innerHTML = extraHtml || '';
  $('alertModal').style.display = 'flex';
}

function showErrorPopup(message) {
  showAlertPopup('error', 'เกิดข้อผิดพลาด', message || 'ไม่สามารถทำรายการได้', '', 'close');
}

function buildLuxuryCertificate(ticketId, checkUrl) {
  return '' +
    '<div class="certificate-box">' +
      '<div class="certificate-title">Official Confirmation</div>' +
      '<div class="certificate-ticket">Ticket ID: ' + esc(ticketId) + '</div>' +
      '<div class="certificate-line"><strong>สถานะ:</strong> ระบบบันทึกคำร้องเรียบร้อยแล้ว</div>' +
      '<div class="certificate-line"><strong>ลิงก์ตรวจสอบสถานะ:</strong><br><a href="' + esc(checkUrl || '#') + '" target="_blank">' + esc(checkUrl || '-') + '</a></div>' +
    '</div>';
}

function showSuccessPopup(title, message, extraHtml, action) {
  showAlertPopup('success', title, message, extraHtml || '', action || 'close');
}

function closeAlertModal() {
  $('alertModal').style.display = 'none';

  if (closeAlertAction === 'reload') {
    window.location.href = window.location.pathname + window.location.search;
    return;
  }

  if (closeAlertAction === 'reset') {
    resetForm();
  }
}

function openOtpModal() {
  $('otpModal').style.display = 'flex';
}

function closeOtpModal() {
  $('otpModal').style.display = 'none';
}

function updateFileSummary() {
  const files = $('files').files;
  if (!files || !files.length) {
    $('fileSummary').textContent = 'ยังไม่ได้เลือกไฟล์';
    return;
  }

  let total = 0;
  for (const f of files) total += f.size;

  const mb = (total / (1024 * 1024)).toFixed(2);
  $('fileSummary').textContent = 'เลือกแล้ว ' + files.length + ' ไฟล์ รวมประมาณ ' + mb + ' MB';
}

function validateEmail(email) {
  const v = String(email || '').trim().toLowerCase();
  return /^[a-zA-Z0-9._%+-]+@nmu\.ac\.th$/.test(v);
}

function unlockForm(email) {
  verifiedEmail = String(email || '').trim().toLowerCase();
  $('ownerEmail').value = verifiedEmail;
  $('ownerEmail').readOnly = true;
  $('ticketFormArea').classList.remove('form-locked');

  const badge = $('verifiedBadge');
  badge.classList.remove('hidden');
  badge.textContent = 'ยืนยันอีเมลแล้ว: ' + verifiedEmail;
}

async function loadDropdownData() {
  try {
    setLoading(true, 'กำลังโหลดข้อมูล...');
    const res = await api('getDropdownData');

    setLoading(false);

    if (!res || !res.ok) {
      showErrorPopup((res && res.message) || 'โหลดรายการไม่สำเร็จ');
      return;
    }

    fillSelectOptions('division', res.divisions || [], '-- กรุณาเลือกส่วนงาน --');
    fillSelectOptions('department', res.departments || [], '-- กรุณาเลือกฝ่าย --');
    fillSelectOptions('sendSystem', res.sendSystems || [], '-- กรุณาเลือกส่งระบบ --');
  } catch (err) {
    setLoading(false);
    showErrorPopup(err.message || 'เกิดข้อผิดพลาดในการโหลด dropdown');
  }
}

async function openOtpFlow() {
  if (isBusy) return;

  const email = $('ownerEmail').value.trim().toLowerCase();

  if (!email) {
    showErrorPopup('กรุณากรอกอีเมล');
    return;
  }

  if (!validateEmail(email)) {
    showErrorPopup('กรุณาใช้อีเมล @nmu.ac.th เท่านั้น');
    return;
  }

  try {
    setLoading(true, 'กำลังส่ง OTP...');

    const res = await api('sendOtp', {
      email: email,
      purpose: 'submit'
    });

    setLoading(false);

    if (!res || !res.ok) {
      showErrorPopup((res && res.message) || 'ส่ง OTP ไม่สำเร็จ');
      return;
    }

    currentRequestId = res.requestId || '';
    $('otpInput').value = '';
    $('otpModalText').innerHTML =
      'กรุณากรอก OTP ที่ส่งไปยัง <strong>' + esc(email) + '</strong>';
    openOtpModal();

  } catch (err) {
    setLoading(false);
    showErrorPopup(err.message || 'เกิดข้อผิดพลาดในการส่ง OTP');
  }
}

async function verifyOtp() {
  if (isBusy) return;

  const otp = $('otpInput').value.trim();
  if (!otp || otp.length !== 6) {
    showErrorPopup('กรุณากรอก OTP 6 หลัก');
    return;
  }

  try {
    setLoading(true, 'กำลังยืนยัน OTP...');

    const res = await api('verifyOtp', {
      requestId: currentRequestId,
      otp: otp,
      purpose: 'submit'
    });

    setLoading(false);

    if (!res || !res.ok) {
      showErrorPopup((res && res.message) || 'ยืนยัน OTP ไม่สำเร็จ');
      return;
    }

    verifiedRequestId = res.verifiedRequestId || '';
    unlockForm(res.email || $('ownerEmail').value.trim());
    closeOtpModal();
    showSuccessPopup('ยืนยันอีเมลสำเร็จ', 'กรุณากรอกข้อมูลคำร้องต่อได้เลย');

  } catch (err) {
    setLoading(false);
    showErrorPopup(err.message || 'เกิดข้อผิดพลาดในการยืนยัน OTP');
  }
}

function resetForm() {
  $('ownerEmail').value = '';
  $('ownerEmail').readOnly = false;
  $('sendSystem').value = '';
  $('titleName').value = '';
  $('fullName').value = '';
  $('division').value = '';
  $('department').value = '';
  $('phone').value = '';
  $('question').value = '';
  $('detail').value = '';
  $('files').value = '';
  $('otpInput').value = '';

  document.querySelectorAll('input[name="gender"]').forEach(function(el) {
    el.checked = false;
  });

  $('ticketFormArea').classList.add('form-locked');
  $('verifiedBadge').classList.add('hidden');
  $('verifiedBadge').textContent = '';
  $('fileSummary').textContent = 'ยังไม่ได้เลือกไฟล์';

  verifiedRequestId = '';
  verifiedEmail = '';
  currentRequestId = '';
  closeAlertAction = 'close';

  closeOtpModal();
  $('alertModal').style.display = 'none';
}

function validateBeforeSubmit(payload) {
  if (!verifiedRequestId) return 'กรุณายืนยันอีเมลด้วย OTP ก่อน';
  if (!payload.ownerEmail) return 'ไม่พบอีเมลผู้ส่งคำร้อง';
  if (!payload.sendSystem) return 'กรุณาเลือกส่งระบบ';
  if (!payload.titleName) return 'กรุณาเลือกคำนำหน้า';
  if (!payload.fullName) return 'กรุณากรอกชื่อ-นามสกุล';
  if (!payload.gender) return 'กรุณาเลือกเพศ';
  if (!payload.division) return 'กรุณาเลือกส่วนงาน';
  if (!payload.department) return 'กรุณาเลือกฝ่าย';
  if (!payload.phone) return 'กรุณากรอกเบอร์ภายใน';
  if (!payload.question) return 'กรุณากรอกคำถามหรือข้อสงสัย';
  return '';
}

function fileToBase64(file) {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const result = e.target.result || '';
      const base64 = String(result).split(',')[1] || '';
      resolve({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64: base64
      });
    };
    reader.onerror = function() {
      reject(new Error('อ่านไฟล์ไม่สำเร็จ: ' + file.name));
    };
    reader.readAsDataURL(file);
  });
}

async function collectPayload() {
  const inputFiles = $('files').files;
  const files = [];
  let totalSize = 0;

  for (const f of inputFiles) {
    const sizeMb = f.size / (1024 * 1024);
    totalSize += f.size;

    if (sizeMb > MAX_FILE_SIZE_MB) {
      throw new Error('ไฟล์ "' + f.name + '" มีขนาดเกิน ' + MAX_FILE_SIZE_MB + ' MB');
    }
  }

  const totalMb = totalSize / (1024 * 1024);
  if (totalMb > MAX_TOTAL_SIZE_MB) {
    throw new Error('ขนาดไฟล์รวมเกิน ' + MAX_TOTAL_SIZE_MB + ' MB');
  }

  for (const f of inputFiles) {
    files.push(await fileToBase64(f));
  }

  return {
    ownerEmail: verifiedEmail || $('ownerEmail').value.trim(),
    sendSystem: $('sendSystem').value.trim(),
    titleName: $('titleName').value.trim(),
    fullName: $('fullName').value.trim(),
    gender: getGender(),
    division: $('division').value.trim(),
    department: $('department').value.trim(),
    phone: $('phone').value.trim(),
    question: $('question').value.trim(),
    detail: $('detail').value.trim(),
    files: files
  };
}

async function submitTicket() {
  if (isBusy) return;

  try {
    setLoading(true, 'กำลังเตรียมข้อมูล...');

    const payload = await collectPayload();
    const validationMessage = validateBeforeSubmit(payload);

    if (validationMessage) {
      setLoading(false);
      showErrorPopup(validationMessage);
      return;
    }

    setLoading(true, 'กำลังบันทึกคำร้อง...');

    const res = await api('submitTicket', {
      verifiedRequestId: verifiedRequestId,
      payload: payload
    });

    setLoading(false);

    if (!res || !res.ok) {
      showErrorPopup((res && res.message) || 'สร้าง Ticket ไม่สำเร็จ');
      return;
    }

    const extraHtml = buildLuxuryCertificate(res.ticketId, res.checkUrl);
    showSuccessPopup(
      'ออกเลขคำร้องเรียบร้อยแล้ว',
      'ระบบได้บันทึกข้อมูลของท่านสำเร็จ',
      extraHtml,
      'reload'
    );

  } catch (err) {
    setLoading(false);
    showErrorPopup((err && err.message) || 'เกิดข้อผิดพลาดในการสร้าง Ticket');
  }
}

window.addEventListener('load', function() {
  loadDropdownData();
  $('files').addEventListener('change', updateFileSummary);
});