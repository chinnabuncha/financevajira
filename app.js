const API_URL = 'PUT_YOUR_WEBAPP_URL_HERE';

let currentRequestId = '';
let verifiedRequestId = '';
let verifiedEmail = '';
let closeAlertAction = 'close';
let isBusy = false;

const MAX_FILE_SIZE_MB = 5;
const MAX_TOTAL_SIZE_MB = 15;
const MAX_QUESTION_ITEMS = 10;

const FORM_CONFIG = window.FORM_CONFIG || {
  formType: 'acc',
  systemName: 'ระบบงานบัญชี',
  prefix: 'ACC'
};

function $(id) { return document.getElementById(id); }
function esc(v) { return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

async function api(action, payload = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload })
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { throw new Error('API ตอบกลับไม่ถูกต้อง: ' + text); }
}

function setLoading(isLoading) {
  isBusy = !!isLoading;
  document.body.classList.toggle('is-busy', !!isLoading);
  ['otpBtn','submitBtn','addQuestionBtn'].forEach(function(id){ const el=$(id); if(el) el.disabled=!!isLoading; });
}

function getGender() {
  const checked = document.querySelector('input[name="gender"]:checked');
  return checked ? checked.value : '';
}

function fillSelectOptions(selectId, items, placeholder) {
  const select = $(selectId); if (!select) return;
  const frag = document.createDocumentFragment();
  const first = document.createElement('option'); first.value=''; first.textContent=placeholder; frag.appendChild(first);
  (items || []).forEach(function(item){ const opt=document.createElement('option'); opt.value=item; opt.textContent=item; frag.appendChild(opt); });
  select.innerHTML=''; select.appendChild(frag);
}

function showAlertPopup(type, title, message, extraHtml, action) {
  closeAlertAction = action || 'close';
  const icon = $('alertIcon');
  if (icon) {
    if (type === 'error') { icon.className='alert-icon alert-error'; icon.textContent='!'; }
    else { icon.className='alert-icon alert-success'; icon.textContent='✓'; }
  }
  if ($('alertTitle')) $('alertTitle').textContent = title || 'แจ้งเตือน';
  if ($('alertMessage')) $('alertMessage').textContent = message || '';
  if ($('alertExtra')) $('alertExtra').innerHTML = extraHtml || '';
  if ($('alertModal')) $('alertModal').style.display = 'flex';
}
function showErrorPopup(message) { showAlertPopup('error','เกิดข้อผิดพลาด',message || 'ไม่สามารถทำรายการได้','','close'); }
function buildLuxuryCertificate(ticketId, checkUrl, itemCount) {
  return '<div class="certificate-box">'
    + '<div class="certificate-title">Official Confirmation</div>'
    + '<div class="certificate-ticket">Ticket ID: ' + esc(ticketId) + '</div>'
    + '<div class="certificate-line"><strong>สถานะ:</strong> ระบบบันทึกคำร้องเรียบร้อยแล้ว</div>'
    + '<div class="certificate-line"><strong>จำนวนรายการ:</strong> ' + esc(itemCount || 1) + ' รายการ</div>'
    + '<div class="certificate-line"><strong>ลิงก์ตรวจสอบสถานะ:</strong><br><a href="' + esc(checkUrl || '#') + '" target="_blank">' + esc(checkUrl || '-') + '</a></div>'
    + '</div>';
}
function showSuccessPopup(title, message, extraHtml, action) { showAlertPopup('success', title, message, extraHtml || '', action || 'close'); }
function closeAlertModal() {
  if ($('alertModal')) $('alertModal').style.display = 'none';
  if (closeAlertAction === 'reload') { window.location.href = window.location.pathname + window.location.search; return; }
  if (closeAlertAction === 'reset') resetForm();
}
function openOtpModal(){ if($('otpModal')) $('otpModal').style.display='flex'; }
function closeOtpModal(){ if($('otpModal')) $('otpModal').style.display='none'; }

function getAllQuestionBlocks(){ return Array.from(document.querySelectorAll('.question-block')); }
function updateQuestionSummary(){
  const count = getAllQuestionBlocks().length || 1;
  if ($('questionCountText')) $('questionCountText').textContent = 'ขณะนี้มี ' + count + ' รายการคำถาม';
  if ($('addQuestionBtn')) $('addQuestionBtn').disabled = count >= MAX_QUESTION_ITEMS || isBusy;
}
function getQuestionBlockHtml(index){
  const no = index + 1;
  return '<div class="question-block" data-index="' + no + '">'
    + '<div class="question-block-head">'
    + '<div class="question-block-title">คำถามรายการที่ ' + no + '</div>'
    + (no > 1 ? '<button type="button" class="btn-chip btn-chip-danger" onclick="removeQuestionBlock(this)">ลบรายการนี้</button>' : '')
    + '</div>'
    + '<div class="grid">'
    + '<div class="field full"><label>ตั้งคำถามหรือข้อสงสัย <span class="required-star">*</span></label><div class="input-shell"><input type="text" class="question-input" placeholder="กรอกหัวข้อคำถามหรือข้อสงสัย"></div></div>'
    + '<div class="field full"><label>รายละเอียดเพิ่มเติม</label><div class="input-shell"><textarea class="detail-input" placeholder="กรอกรายละเอียดเพิ่มเติม"></textarea></div></div>'
    + '<div class="field full"><label>ไฟล์แนบของรายการนี้</label><div class="file-card"><input type="file" class="item-files" multiple><div class="item-file-summary file-summary">ยังไม่ได้เลือกไฟล์</div></div></div>'
    + '</div></div>';
}
function addQuestionBlock(prefill){
  const wrap = $('questionItems'); if(!wrap) return;
  const current = getAllQuestionBlocks().length;
  if(current >= MAX_QUESTION_ITEMS){ showErrorPopup('เพิ่มคำถามได้สูงสุด ' + MAX_QUESTION_ITEMS + ' รายการต่อ 1 Ticket'); return; }
  const holder = document.createElement('div'); holder.innerHTML = getQuestionBlockHtml(current);
  const block = holder.firstElementChild; wrap.appendChild(block);
  const fileInput = block.querySelector('.item-files');
  if(fileInput) fileInput.addEventListener('change', function(){ updateSingleFileSummary(fileInput); });
  if(prefill){ const q=block.querySelector('.question-input'); const d=block.querySelector('.detail-input'); if(q) q.value=prefill.question||''; if(d) d.value=prefill.detail||''; }
  renumberQuestionBlocks(); updateQuestionSummary();
}
function removeQuestionBlock(btn){ const block = btn.closest('.question-block'); if(!block) return; block.remove(); renumberQuestionBlocks(); updateQuestionSummary(); }
function renumberQuestionBlocks(){
  getAllQuestionBlocks().forEach(function(block, idx){
    block.dataset.index = String(idx + 1);
    const title = block.querySelector('.question-block-title'); if(title) title.textContent='คำถามรายการที่ ' + (idx + 1);
    const head = block.querySelector('.question-block-head'); if(!head) return;
    const oldBtn = head.querySelector('.btn-chip-danger');
    if(idx === 0 && oldBtn) oldBtn.remove();
    if(idx > 0 && !oldBtn){ const btn=document.createElement('button'); btn.type='button'; btn.className='btn-chip btn-chip-danger'; btn.textContent='ลบรายการนี้'; btn.onclick=function(){ removeQuestionBlock(btn); }; head.appendChild(btn); }
  });
}
function updateSingleFileSummary(input){
  const fileCard=input.closest('.file-card'); const summary=fileCard?fileCard.querySelector('.item-file-summary'):null; if(!summary) return;
  const files=input.files||[]; if(!files.length){ summary.textContent='ยังไม่ได้เลือกไฟล์'; return; }
  let total=0; for(const f of files) total+=f.size; summary.textContent='เลือกแล้ว ' + files.length + ' ไฟล์ รวมประมาณ ' + (total/(1024*1024)).toFixed(2) + ' MB';
}
function updateFileSummary(){
  const input=$('files'); const summary=$('fileSummary'); if(!input||!summary) return;
  const files=input.files||[]; if(!files.length){ summary.textContent='ยังไม่ได้เลือกไฟล์'; return; }
  let total=0; for(const f of files) total+=f.size; summary.textContent='เลือกแล้ว ' + files.length + ' ไฟล์ รวมประมาณ ' + (total/(1024*1024)).toFixed(2) + ' MB';
}
function validateEmail(email){ return /^[a-zA-Z0-9._%+-]+@nmu\.ac\.th$/.test(String(email||'').trim().toLowerCase()); }
function unlockForm(email){
  verifiedEmail = String(email || '').trim().toLowerCase();
  if($('ownerEmail')){ $('ownerEmail').value = verifiedEmail; $('ownerEmail').readOnly = true; }
  document.querySelectorAll('.otp-section').forEach(function(el){ el.classList.remove('form-locked'); });
  if(getAllQuestionBlocks().length === 0) addQuestionBlock();
  updateQuestionSummary();
  const badge=$('verifiedBadge'); if(badge){ badge.classList.remove('hidden'); badge.textContent='ยืนยันอีเมลแล้ว: ' + verifiedEmail; }
}
async function loadDropdownData(){
  try{
    setLoading(true);
    const res = await api('getDropdownData');
    if(!res || !res.ok) throw new Error((res && res.message) || 'โหลดรายการไม่สำเร็จ');
    fillSelectOptions('division', res.divisions || [], '-- กรุณาเลือกส่วนงาน --');
    fillSelectOptions('department', res.departments || [], '-- กรุณาเลือกฝ่าย --');
    fillSelectOptions('sendSystem', res.sendSystems || [], '-- กรุณาเลือกส่งระบบ --');
  }catch(err){ showErrorPopup(err.message || 'เกิดข้อผิดพลาดในการโหลด dropdown'); }
  finally{ setLoading(false); }
}
async function openOtpFlow(){
  if(isBusy) return;
  const email = ($('ownerEmail') || {}).value ? $('ownerEmail').value.trim().toLowerCase() : '';
  if(!email) return showErrorPopup('กรุณากรอกอีเมล');
  if(!validateEmail(email)) return showErrorPopup('กรุณาใช้อีเมล @nmu.ac.th เท่านั้น');
  try{
    setLoading(true);
    const res = await api('sendOtp', { email: email, purpose: 'submit', formType: FORM_CONFIG.formType });
    if(!res || !res.ok) throw new Error((res && res.message) || 'ส่ง OTP ไม่สำเร็จ');
    currentRequestId = res.requestId || '';
    if($('otpInput')) $('otpInput').value='';
    if($('otpModalText')) $('otpModalText').innerHTML='กรุณากรอก OTP ที่ส่งไปยัง <strong>' + esc(email) + '</strong>';
    openOtpModal();
  }catch(err){ showErrorPopup(err.message || 'เกิดข้อผิดพลาดในการส่ง OTP'); }
  finally{ setLoading(false); }
}
async function verifyOtp(){
  if(isBusy) return;
  const otp = $('otpInput') ? $('otpInput').value.trim() : '';
  if(!otp || otp.length !== 6) return showErrorPopup('กรุณากรอก OTP 6 หลัก');
  try{
    setLoading(true);
    const res = await api('verifyOtp', { requestId: currentRequestId, otp: otp, purpose: 'submit', formType: FORM_CONFIG.formType });
    if(!res || !res.ok) throw new Error((res && res.message) || 'ยืนยัน OTP ไม่สำเร็จ');
    verifiedRequestId = res.verifiedRequestId || '';
    unlockForm(res.email || (($('ownerEmail') || {}).value || ''));
    closeOtpModal();
    showSuccessPopup('ยืนยันอีเมลสำเร็จ', 'ขณะนี้ท่านสามารถกรอกข้อมูล ส่งคำร้อง และเพิ่มรายการคำถามได้ครบทุกส่วนแล้ว');
  }catch(err){ showErrorPopup(err.message || 'เกิดข้อผิดพลาดในการยืนยัน OTP'); }
  finally{ setLoading(false); }
}
function resetQuestionBlocks(){ const wrap=$('questionItems'); if(!wrap) return; wrap.innerHTML=''; addQuestionBlock(); updateQuestionSummary(); }
function resetForm(){
  if($('ownerEmail')){ $('ownerEmail').value=''; $('ownerEmail').readOnly=false; }
  ['sendSystem','titleName','fullName','division','department','phone'].forEach(function(id){ if($(id)) $(id).value=''; });
  if($('files')) $('files').value=''; if($('otpInput')) $('otpInput').value='';
  document.querySelectorAll('input[name="gender"]').forEach(function(el){ el.checked=false; });
  document.querySelectorAll('.otp-section').forEach(function(el){ el.classList.add('form-locked'); });
  if($('verifiedBadge')){ $('verifiedBadge').classList.add('hidden'); $('verifiedBadge').textContent=''; }
  if($('fileSummary')) $('fileSummary').textContent='ยังไม่ได้เลือกไฟล์';
  verifiedRequestId=''; verifiedEmail=''; currentRequestId=''; closeAlertAction='close';
  resetQuestionBlocks(); closeOtpModal(); if($('alertModal')) $('alertModal').style.display='none';
}
function validateBeforeSubmit(payload){
  if(!verifiedRequestId) return 'กรุณายืนยันอีเมลด้วย OTP ก่อน';
  if(!payload.ownerEmail) return 'ไม่พบอีเมลผู้ส่งคำร้อง';
  if(!payload.sendSystem) return 'กรุณาเลือกส่งระบบ';
  if(!payload.titleName) return 'กรุณาเลือกคำนำหน้า';
  if(!payload.fullName) return 'กรุณากรอกชื่อ-นามสกุล';
  if(!payload.gender) return 'กรุณาเลือกเพศ';
  if(!payload.division) return 'กรุณาเลือกส่วนงาน';
  if(!payload.department) return 'กรุณาเลือกฝ่าย';
  if(!payload.phone) return 'กรุณากรอกเบอร์ภายใน';
  if(!payload.items || !payload.items.length) return 'กรุณากรอกคำถามอย่างน้อย 1 รายการ';
  for(let i=0;i<payload.items.length;i++){ if(!payload.items[i].question) return 'กรุณากรอกคำถามหรือข้อสงสัยในรายการที่ ' + (i + 1); }
  return '';
}
function fileToBase64(file){ return new Promise(function(resolve,reject){ const reader=new FileReader(); reader.onload=function(e){ const result=e.target.result||''; const base64=String(result).split(',')[1]||''; resolve({ name:file.name, mimeType:file.type||'application/octet-stream', base64:base64 }); }; reader.onerror=function(){ reject(new Error('อ่านไฟล์ไม่สำเร็จ: ' + file.name)); }; reader.readAsDataURL(file); }); }
async function collectAllFilesForLimitCheck(){
  const all=[]; if($('files') && $('files').files) for(const f of $('files').files) all.push(f);
  document.querySelectorAll('.item-files').forEach(function(input){ for(const f of input.files || []) all.push(f); });
  let totalSize=0; for(const f of all){ const sizeMb=f.size/(1024*1024); totalSize+=f.size; if(sizeMb > MAX_FILE_SIZE_MB) throw new Error('ไฟล์ "' + f.name + '" มีขนาดเกิน ' + MAX_FILE_SIZE_MB + ' MB'); }
  const totalMb=totalSize/(1024*1024); if(totalMb > MAX_TOTAL_SIZE_MB) throw new Error('ขนาดไฟล์รวมเกิน ' + MAX_TOTAL_SIZE_MB + ' MB');
}
async function collectPayload(){
  await collectAllFilesForLimitCheck();
  const generalFiles=[]; if($('files') && $('files').files){ for(const f of $('files').files){ const item=await fileToBase64(f); item.scope='general'; generalFiles.push(item); } }
  const items=[]; const itemFiles=[]; const blocks=getAllQuestionBlocks();
  for(let i=0;i<blocks.length;i++){
    const block=blocks[i]; const question=((block.querySelector('.question-input') || {}).value || '').trim(); const detail=((block.querySelector('.detail-input') || {}).value || '').trim(); const fileInput=block.querySelector('.item-files');
    items.push({ question: question, detail: detail });
    if(fileInput && fileInput.files){ for(const f of fileInput.files){ const item=await fileToBase64(f); item.scope='item'; item.itemNo=i+1; itemFiles.push(item); } }
  }
  return { formType: FORM_CONFIG.formType, ownerEmail: verifiedEmail || (($('ownerEmail')||{}).value||'').trim(), sendSystem:(($('sendSystem')||{}).value||'').trim(), titleName:(($('titleName')||{}).value||'').trim(), fullName:(($('fullName')||{}).value||'').trim(), gender:getGender(), division:(($('division')||{}).value||'').trim(), department:(($('department')||{}).value||'').trim(), phone:(($('phone')||{}).value||'').trim(), items:items, files:generalFiles.concat(itemFiles) };
}
async function submitTicket(){
  if(isBusy) return;
  try{
    setLoading(true);
    const payload = await collectPayload();
    const validationMessage = validateBeforeSubmit(payload); if(validationMessage) throw new Error(validationMessage);
    const res = await api('submitTicket', { formType: FORM_CONFIG.formType, verifiedRequestId: verifiedRequestId, payload: payload });
    if(!res || !res.ok) throw new Error((res && res.message) || 'สร้าง Ticket ไม่สำเร็จ');
    showSuccessPopup('ออกเลขคำร้องเรียบร้อยแล้ว','ระบบได้บันทึกข้อมูลของท่านสำเร็จ',buildLuxuryCertificate(res.ticketId,res.checkUrl,res.itemCount),'reload');
  }catch(err){ showErrorPopup((err && err.message) || 'เกิดข้อผิดพลาดในการสร้าง Ticket'); }
  finally{ setLoading(false); }
}
function applyFormBranding(){ document.documentElement.setAttribute('data-form-type', FORM_CONFIG.formType || 'acc'); if($('heroSystemName')) $('heroSystemName').textContent = FORM_CONFIG.systemName || 'ระบบบริการ'; if($('heroPrefixText')) $('heroPrefixText').textContent = (FORM_CONFIG.prefix || '').toUpperCase(); if(FORM_CONFIG.systemName) document.title = FORM_CONFIG.systemName; }
window.addEventListener('load', function(){ applyFormBranding(); loadDropdownData(); resetQuestionBlocks(); if($('files')) $('files').addEventListener('change', updateFileSummary); if($('addQuestionBtn')) $('addQuestionBtn').addEventListener('click', addQuestionBlock); });
