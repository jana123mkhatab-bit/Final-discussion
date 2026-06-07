// ============================================================
// SWAPIFY — Report User Module
// Self-contained. Depends on: SwapifyStore, SwapifyAuth,
// SwapifyValidate, SwapifyUI, SwapifyAdmin (from app.js)
// ============================================================
(function () {
  'use strict';

  /* ── COUNTRY CODES ──────────────────────────────────────── */
  var countryCodes = [
    { code: '+1',   label: 'US +1',   minLen: 10, maxLen: 10 },
    { code: '+44',  label: 'UK +44',  minLen: 10, maxLen: 10 },
    { code: '+20',  label: 'EG +20',  minLen: 10, maxLen: 10 },
    { code: '+33',  label: 'FR +33',  minLen: 9,  maxLen: 9  },
    { code: '+49',  label: 'DE +49',  minLen: 10, maxLen: 11 },
    { code: '+34',  label: 'ES +34',  minLen: 9,  maxLen: 9  },
    { code: '+91',  label: 'IN +91',  minLen: 10, maxLen: 10 },
    { code: '+81',  label: 'JP +81',  minLen: 10, maxLen: 10 },
    { code: '+86',  label: 'CN +86',  minLen: 11, maxLen: 11 },
    { code: '+971', label: 'AE +971', minLen: 9,  maxLen: 9  },
    { code: '+966', label: 'SA +966', minLen: 9,  maxLen: 9  },
    { code: '+55',  label: 'BR +55',  minLen: 10, maxLen: 11 },
    { code: '+61',  label: 'AU +61',  minLen: 9,  maxLen: 9  }
  ];

  /* ── ISSUE TYPES ────────────────────────────────────────── */
  var issueTypes = [
    { value: 'fraud', label: 'Fraud / Scam', icon: '🚨' },
    { value: 'misrepresentation', label: 'Misrepresentation', icon: '🎭' },
    { value: 'payment', label: 'Payment Issue', icon: '💳' },
    { value: 'harassment', label: 'Harassment / Abuse', icon: '⚠️' },
    { value: 'spam', label: 'Spam', icon: '📧' },
    { value: 'other', label: 'Other', icon: '📝' }
  ];

  /* ── STATE ──────────────────────────────────────────────── */
  var _overlay = null;
  var _opts = {};
  var _files = [];
  var DESC_MAX = 1000;
  var DESC_MIN = 20;

  /* ── HELPERS ─────────────────────────────────────────────── */
  function esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

  /* Returns the country-code entry for the currently selected dial code */
  function getSelectedCC() {
    var sel = document.getElementById('report-cc');
    if (!sel) return null;
    var code = sel.value;
    return countryCodes.find(function (c) { return c.code === code; }) || null;
  }

  /* Validates phone number digits against the selected country rules */
  function isPhoneValid(digits) {
    var cc = getSelectedCC();
    if (!cc) return digits.length >= 6 && digits.length <= 15;
    return digits.length >= cc.minLen && digits.length <= cc.maxLen;
  }

  /* Keeps the phone field digits-only without changing the validation rules */
  function sanitizePhoneValue(value) {
    return (value || '').replace(/\D/g, '');
  }

  function sanitizePhoneInput(input) {
    var nextValue = sanitizePhoneValue(input.value);
    if (input.value === nextValue) return;

    var cursor = typeof input.selectionStart === 'number' ? input.selectionStart : null;
    var digitsBeforeCursor = cursor === null ? null : sanitizePhoneValue(input.value.slice(0, cursor)).length;

    input.value = nextValue;

    if (cursor !== null && typeof input.setSelectionRange === 'function') {
      var nextCursor = Math.min(digitsBeforeCursor, nextValue.length);
      input.setSelectionRange(nextCursor, nextCursor);
    }
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  /* ── BUILD FORM HTML ─────────────────────────────────────── */
  function buildFormHTML(opts) {
    var user = window.SwapifyAuth ? SwapifyAuth.currentUser() : null;
    var ccOptions = countryCodes.map(function (c) {
      return '<option value="' + c.code + '"' + (c.code === '+1' ? ' selected' : '') + '>' + esc(c.label) + '</option>';
    }).join('');

    var issueRadios = issueTypes.map(function (t) {
      return '<label class="report-radio-option" for="report-issue-' + t.value + '">' +
        '<input type="radio" name="reportIssueType" id="report-issue-' + t.value + '" value="' + t.value + '">' +
        '<span class="report-radio-icon">' + t.icon + '</span>' +
        '<span class="report-radio-label">' + esc(t.label) + '</span>' +
        '</label>';
    }).join('');

    return '<form id="reportUserForm" class="report-form" novalidate autocomplete="off">' +
      /* ── Reported User Badge ── */
      '<div class="report-user-badge">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>' +
        '<span>Reporting: <strong>' + esc(opts.reportedUserName || 'Unknown') + '</strong></span>' +
      '</div>' +

      /* ── A: Reporter Info ── */
      '<fieldset class="report-fieldset">' +
        '<legend class="report-legend">Your Information</legend>' +
        '<div class="report-field-row">' +
          '<div class="form-group"><label for="report-name">User Name</label>' +
            '<input type="text" id="report-name" class="input" placeholder="Your user name" value="' + esc(user ? user.name : '') + '" aria-label="User name">' +
          '</div>' +
          '<div class="form-group"><label for="report-email">Email <span style="color:var(--primary)">*</span></label>' +
            '<input type="email" id="report-email" class="input" placeholder="you@example.com" value="' + esc(user ? user.email : '') + '" required aria-label="Email address">' +
            '<span class="form-error" id="report-email-err"></span>' +
          '</div>' +
        '</div>' +
        '<div class="form-group"><label for="report-phone">Phone Number <span style="color:var(--primary)">*</span></label>' +
          '<div class="report-field-row" style="gap:8px">' +
            '<div class="select-wrap" style="flex:0 0 110px"><select id="report-cc" class="input" aria-label="Country code">' + ccOptions + '</select></div>' +
            '<input type="tel" id="report-phone" class="input" placeholder="555 123 4567" required aria-label="Phone number" inputmode="numeric" autocomplete="tel-national" style="flex:1">' +
          '</div>' +
          '<span class="form-error" id="report-phone-err"></span>' +
        '</div>' +
      '</fieldset>' +

      /* ── C: Interaction Details ── */
      '<fieldset class="report-fieldset">' +
        '<legend class="report-legend">Interaction Details</legend>' +
        '<div class="report-field-row">' +
          '<div class="form-group"><label for="report-listing">Related Listing</label>' +
            '<input type="text" id="report-listing" class="input" placeholder="Item or skill name" value="' + esc(opts.relatedListing || '') + '" aria-label="Related listing">' +
          '</div>' +
          '<div class="form-group"><label for="report-txn">Transaction ID</label>' +
            '<input type="text" id="report-txn" class="input" placeholder="Optional" aria-label="Transaction ID">' +
          '</div>' +
        '</div>' +
        '<div class="report-field-row">' +
          '<div class="form-group"><label for="report-date">Date of Interaction</label>' +
            (function() {
              var _today = new Date().toISOString().slice(0,10);
              var _minD  = new Date(); _minD.setDate(_minD.getDate() - 30);
              var _min   = _minD.toISOString().slice(0,10);
              return '<input type="date" id="report-date" class="input" aria-label="Date of interaction" min="' + _min + '" max="' + _today + '">';
            })() +
          '</div>' +
          '<div class="form-group"><label for="report-interaction">Interaction Type</label>' +
            '<div class="select-wrap"><select id="report-interaction" class="input" aria-label="Interaction type">' +
              '<option value="">Select type...</option><option value="purchase">Purchase</option><option value="sale">Sale</option><option value="chat">Chat / Message</option><option value="other">Other</option>' +
            '</select></div>' +
          '</div>' +
        '</div>' +
        '<div class="form-group" id="report-interaction-other-wrap" style="display:none">' +
          '<label for="report-interaction-other">Please specify</label>' +
          '<input type="text" id="report-interaction-other" class="input" placeholder="Describe the interaction" aria-label="Other interaction type">' +
        '</div>' +
      '</fieldset>' +

      /* ── D: Issue Type ── */
      '<fieldset class="report-fieldset">' +
        '<legend class="report-legend">Issue Type <span style="color:var(--primary)">*</span></legend>' +
        '<div class="report-radio-group" role="radiogroup" aria-label="Issue type">' + issueRadios + '</div>' +
        '<div class="form-group" id="report-other-reason-wrap" style="display:none;margin-top:12px">' +
          '<input type="text" id="report-other-reason" class="input" placeholder="Describe the issue" aria-label="Other issue description">' +
        '</div>' +
        '<span class="form-error" id="report-issue-err"></span>' +
      '</fieldset>' +

      /* ── E: Description ── */
      '<fieldset class="report-fieldset">' +
        '<legend class="report-legend">Description <span style="color:var(--primary)">*</span></legend>' +
        '<div class="form-group">' +
          '<textarea id="report-desc" class="textarea" placeholder="Provide as much detail as possible about the incident (min 20 characters)..." maxlength="' + DESC_MAX + '" required aria-label="Description"></textarea>' +
          '<div class="report-char-counter"><span id="report-char-count">0</span> / ' + DESC_MAX + '</div>' +
          '<span class="form-error" id="report-desc-err"></span>' +
        '</div>' +
      '</fieldset>' +

      /* ── F: Evidence ── */
      '<fieldset class="report-fieldset">' +
        '<legend class="report-legend">Evidence (optional)</legend>' +
        '<div class="report-file-preview" id="report-file-preview"></div>' +
        '<label class="report-file-upload" for="report-file-input" tabindex="0" role="button" aria-label="Upload evidence files">' +
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>' +
          '<span>Click to upload images or PDF</span><span style="font-size:12px;color:var(--muted-fg)">Max 3 files, 5MB each</span>' +
        '</label>' +
        '<input type="file" id="report-file-input" accept="image/jpeg,image/png,image/webp,application/pdf" multiple style="display:none">' +
        '<span class="form-error" id="report-file-err"></span>' +
      '</fieldset>' +

      /* ── G: Declaration ── */
      '<div class="report-declaration">' +
        '<label class="report-checkbox-label" for="report-declare">' +
          '<input type="checkbox" id="report-declare" required aria-label="Declaration checkbox">' +
          '<span>I confirm that the information provided is accurate and truthful.</span>' +
        '</label>' +
        '<span class="form-error" id="report-declare-err"></span>' +
      '</div>' +
    '</form>';
  }

  /* ── CREATE / GET OVERLAY ─────────────────────────────────── */
  function getOverlay() {
    if (_overlay) return _overlay;
    _overlay = el('div', 'modal-overlay');
    _overlay.id = 'reportUserOverlay';
    _overlay.setAttribute('role', 'dialog');
    _overlay.setAttribute('aria-modal', 'true');
    _overlay.setAttribute('aria-label', 'Report User');
    _overlay.innerHTML =
      '<div class="modal" style="max-width:620px">' +
        '<div class="modal-header">' +
          '<h2 id="reportModalTitle">Report User</h2>' +
          '<button class="btn btn-ghost btn-icon report-modal-close" aria-label="Close">&times;</button>' +
        '</div>' +
        '<div class="modal-body" id="reportModalBody"></div>' +
        '<div class="modal-footer" id="reportModalFooter"></div>' +
      '</div>';
    document.body.appendChild(_overlay);

    // Close handlers
    _overlay.querySelector('.report-modal-close').addEventListener('click', close);
    _overlay.addEventListener('click', function (e) { if (e.target === _overlay) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && _overlay.classList.contains('active')) close(); });
    return _overlay;
  }

  /* ── OPEN ────────────────────────────────────────────────── */
  function open(opts) {
    _opts = opts || {};
    _files = [];

    /* ── Bug #5: Prevent self-reporting ── */
    var currentUser = window.SwapifyAuth ? SwapifyAuth.currentUser() : null;
    if (currentUser && _opts.reportedUserId && currentUser.id === _opts.reportedUserId) {
      SwapifyUI.toast('You cannot report yourself', 'warning');
      return; // block opening the modal entirely
    }

    var overlay = getOverlay();
    var body = overlay.querySelector('#reportModalBody');
    var footer = overlay.querySelector('#reportModalFooter');
    var title = overlay.querySelector('#reportModalTitle');

    title.textContent = 'Report User';
    body.innerHTML = buildFormHTML(_opts);
    footer.innerHTML =
      '<button type="button" class="btn btn-outline" id="reportCancelBtn">Cancel</button>' +
      '<button type="submit" form="reportUserForm" class="btn btn-primary" id="reportSubmitBtn" disabled>' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg> Submit Report' +
      '</button>';

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    bindFormEvents();
    overlay.querySelector('#report-email').focus();
  }

  /* ── CLOSE ───────────────────────────────────────────────── */
  function close() {
    if (_overlay) {
      _overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
    _files = [];
  }

  /* ── BIND FORM EVENTS ────────────────────────────────────── */
  function bindFormEvents() {
    var form = document.getElementById('reportUserForm');
    if (!form) return;

    // Cancel
    document.getElementById('reportCancelBtn').addEventListener('click', close);

    // Interaction type "Other" conditional
    var interSel = document.getElementById('report-interaction');
    interSel.addEventListener('change', function () {
      document.getElementById('report-interaction-other-wrap').style.display = interSel.value === 'other' ? 'flex' : 'none';
      checkFormValidity();
    });

    // Issue type "Other" conditional
    form.addEventListener('change', function (e) {
      if (e.target.name === 'reportIssueType') {
        document.getElementById('report-other-reason-wrap').style.display = e.target.value === 'other' ? 'block' : 'none';
        document.getElementById('report-issue-err').textContent = '';
        // Highlight selected radio
        form.querySelectorAll('.report-radio-option').forEach(function (opt) { opt.classList.remove('active'); });
        e.target.closest('.report-radio-option').classList.add('active');
        checkFormValidity();
      }
    });

    // Description char counter
    var desc = document.getElementById('report-desc');
    desc.addEventListener('input', function () {
      var count = desc.value.length;
      document.getElementById('report-char-count').textContent = count;
      var counter = document.querySelector('.report-char-counter');
      counter.style.color = count > DESC_MAX * 0.9 ? 'var(--error)' : count >= DESC_MIN ? 'var(--success)' : '';
      var err = document.getElementById('report-desc-err');
      if (count > 0 && count < DESC_MIN) err.textContent = 'At least ' + DESC_MIN + ' characters required';
      else err.textContent = '';
      checkFormValidity();
    });

    // Email live validation — Bug #3: must match logged-in user's email
    var emailEl = document.getElementById('report-email');
    emailEl.addEventListener('input', function () {
      var loggedInUser = window.SwapifyAuth ? SwapifyAuth.currentUser() : null;
      var formatOk = SwapifyValidate.email(emailEl.value);
      var matchOk  = loggedInUser ? emailEl.value.trim().toLowerCase() === loggedInUser.email.toLowerCase() : true;
      var valid    = formatOk && matchOk;
      emailEl.classList.toggle('valid', valid);
      emailEl.classList.toggle('invalid', emailEl.value.length > 0 && !valid);
      var errMsg = '';
      if (emailEl.value.length > 0) {
        if (!formatOk) errMsg = 'Please enter a valid email';
        else if (!matchOk) errMsg = 'Email must match your logged-in account email';
      }
      document.getElementById('report-email-err').textContent = errMsg;
      checkFormValidity();
    });

    // Phone live validation — Bug #2: country-based length rules
    var phoneEl = document.getElementById('report-phone');
    var ccSelect = document.getElementById('report-cc');
    function validatePhone() {
      var digits = phoneEl.value.replace(/[\s\-()]/g, '');
      var valid = digits.length > 0 && isPhoneValid(digits);
      phoneEl.classList.toggle('valid', valid);
      phoneEl.classList.toggle('invalid', digits.length > 0 && !valid);
      var cc = getSelectedCC();
      var hint = cc ? cc.minLen + (cc.maxLen !== cc.minLen ? '-' + cc.maxLen : '') + ' digits' : '6-15 digits';
      document.getElementById('report-phone-err').textContent = digits.length > 0 && !valid ? 'Enter a valid phone number (' + hint + ')' : '';
      checkFormValidity();
    }
    phoneEl.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length === 1 && !/^[0-9]$/.test(e.key)) e.preventDefault();
    });
    phoneEl.addEventListener('paste', function (e) {
      var clipboard = e.clipboardData || window.clipboardData;
      var pastedText = clipboard ? clipboard.getData('text') : '';
      var digits = sanitizePhoneValue(pastedText);
      e.preventDefault();

      if (!digits) return;

      var start = typeof phoneEl.selectionStart === 'number' ? phoneEl.selectionStart : phoneEl.value.length;
      var end = typeof phoneEl.selectionEnd === 'number' ? phoneEl.selectionEnd : phoneEl.value.length;
      var before = sanitizePhoneValue(phoneEl.value.slice(0, start));
      var after = sanitizePhoneValue(phoneEl.value.slice(end));

      phoneEl.value = before + digits + after;
      if (typeof phoneEl.setSelectionRange === 'function') {
        var caret = before.length + digits.length;
        phoneEl.setSelectionRange(caret, caret);
      }

      validatePhone();
    });
    phoneEl.addEventListener('input', function () {
      sanitizePhoneInput(phoneEl);
      validatePhone();
    });
    ccSelect.addEventListener('change', validatePhone); // re-validate when country changes

    // Date validation — Bug #4: must be between account creation and today
    var dateEl = document.getElementById('report-date');
    dateEl.addEventListener('change', function () {
      var dateVal = dateEl.value; // YYYY-MM-DD
      if (!dateVal) { document.getElementById('report-date-err') && (document.getElementById('report-date-err').textContent = ''); checkFormValidity(); return; }
      var selectedDate = new Date(dateVal);
      var today = new Date(); today.setHours(23,59,59,999);
      var loggedInUser = window.SwapifyAuth ? SwapifyAuth.currentUser() : null;
      var createdAt = loggedInUser && loggedInUser.createdAt ? new Date(loggedInUser.createdAt) : null;
      var errEl = dateEl.parentElement.querySelector('.form-error') || null;
      // Create error span dynamically if not present
      if (!errEl) {
        errEl = document.createElement('span');
        errEl.className = 'form-error';
        errEl.id = 'report-date-err';
        dateEl.parentElement.appendChild(errEl);
      }
      var errMsg = '';
      var thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        errMsg = 'Date cannot be in the future.';
      } else if (selectedDate < thirtyDaysAgo) {
        errMsg = 'Date cannot be more than 30 days in the past.';
      } else if (createdAt && selectedDate < createdAt) {
        errMsg = 'Date cannot be before your account was created.';
      }
      errEl.textContent = errMsg;
      dateEl.classList.toggle('invalid', errMsg.length > 0);
      dateEl.classList.toggle('valid', errMsg.length === 0);
      checkFormValidity();
    });

    // Declaration checkbox
    document.getElementById('report-declare').addEventListener('change', checkFormValidity);

    // File upload
    var fileInput = document.getElementById('report-file-input');
    fileInput.addEventListener('change', handleFileSelect);

    // Upload label keyboard
    var uploadLabel = form.querySelector('.report-file-upload');
    if (uploadLabel) {
      uploadLabel.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
      });
    }

    // Submit
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitReport();
    });
  }

  /* ── CHECK FORM VALIDITY ─────────────────────────────────── */
  function checkFormValidity() {
    var btn = document.getElementById('reportSubmitBtn');
    if (!btn) return;
    var email = document.getElementById('report-email');
    var phone = document.getElementById('report-phone');
    var desc = document.getElementById('report-desc');
    var declare = document.getElementById('report-declare');
    var dateEl = document.getElementById('report-date');
    var issueSelected = document.querySelector('input[name="reportIssueType"]:checked');

    // Bug #3: email must also match logged-in user
    var loggedInUser = window.SwapifyAuth ? SwapifyAuth.currentUser() : null;
    var emailFormatOk = SwapifyValidate.email(email.value);
    var emailMatchOk  = loggedInUser ? email.value.trim().toLowerCase() === loggedInUser.email.toLowerCase() : true;

    // Bug #2: country-based phone validation
    var phoneDigits = phone.value.replace(/[\s\-()]/g, '');

    // Bug #4: date validation
    var dateValid = true;
    if (dateEl.value) {
      var selDate = new Date(dateEl.value);
      var today = new Date(); today.setHours(23,59,59,999);
      if (selDate > today) dateValid = false;
      var createdAt = loggedInUser && loggedInUser.createdAt ? new Date(loggedInUser.createdAt) : null;
      if (createdAt && selDate < createdAt) dateValid = false;
    }

    var valid = emailFormatOk && emailMatchOk &&
      isPhoneValid(phoneDigits) && phoneDigits.length > 0 &&
      desc.value.length >= DESC_MIN &&
      declare.checked &&
      !!issueSelected &&
      dateValid;

    btn.disabled = !valid;
  }

  /* ── FILE HANDLING ───────────────────────────────────────── */
  function handleFileSelect(e) {
    var input = e.target;
    var maxSize = 5 * 1024 * 1024;
    var errEl = document.getElementById('report-file-err');
    errEl.textContent = '';

    Array.from(input.files).forEach(function (file) {
      if (_files.length >= 3) { errEl.textContent = 'Maximum 3 files allowed'; return; }
      var ext = file.name.split('.').pop().toLowerCase();
      if (!['jpg','jpeg','png','webp','pdf'].includes(ext)) { errEl.textContent = 'Only JPG, PNG, WEBP, or PDF allowed'; return; }
      if (file.size > maxSize) { errEl.textContent = file.name + ' exceeds 5MB limit'; return; }
      _files.push(file);
    });
    input.value = '';
    renderFilePreviews();
  }

  function renderFilePreviews() {
    var container = document.getElementById('report-file-preview');
    container.innerHTML = '';
    _files.forEach(function (file, idx) {
      var item = el('div', 'report-file-item');
      var isPDF = file.name.toLowerCase().endsWith('.pdf');
      if (isPDF) {
        item.innerHTML = '<div class="report-file-thumb-pdf"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>';
      } else {
        var img = document.createElement('img');
        img.className = 'report-file-thumb';
        img.alt = file.name;
        var reader = new FileReader();
        reader.onload = function (ev) { img.src = ev.target.result; };
        reader.readAsDataURL(file);
        item.appendChild(img);
      }
      var info = el('div', 'report-file-info', '<span class="truncate" style="max-width:120px;font-size:12px;font-weight:500">' + esc(file.name) + '</span><span style="font-size:11px;color:var(--muted-fg)">' + (file.size / 1024).toFixed(0) + ' KB</span>');
      item.appendChild(info);
      var removeBtn = el('button', 'report-file-remove', '&times;');
      removeBtn.setAttribute('aria-label', 'Remove ' + file.name);
      removeBtn.type = 'button';
      removeBtn.addEventListener('click', function () { _files.splice(idx, 1); renderFilePreviews(); });
      item.appendChild(removeBtn);
      container.appendChild(item);
    });
  }

  /* ── SUBMIT ──────────────────────────────────────────────── */
  function submitReport() {
    var btn = document.getElementById('reportSubmitBtn');
    var form = document.getElementById('reportUserForm');

    // Gather data
    var issueEl = document.querySelector('input[name="reportIssueType"]:checked');
    var issueValue = issueEl ? issueEl.value : '';
    var issueLabel = issueEl ? issueEl.closest('.report-radio-option').querySelector('.report-radio-label').textContent : '';

    var reportData = {
      reporterName: document.getElementById('report-name').value.trim(),
      reporterEmail: document.getElementById('report-email').value.trim(),
      reporterPhone: document.getElementById('report-cc').value + ' ' + document.getElementById('report-phone').value.trim(),
      reportedUserId: _opts.reportedUserId || '',
      reportedUserName: _opts.reportedUserName || '',
      relatedListing: document.getElementById('report-listing').value.trim(),
      transactionId: document.getElementById('report-txn').value.trim(),
      interactionDate: document.getElementById('report-date').value,
      interactionType: document.getElementById('report-interaction').value,
      interactionOther: document.getElementById('report-interaction-other').value.trim(),
      issueType: issueValue,
      issueLabel: issueLabel,
      otherReason: document.getElementById('report-other-reason') ? document.getElementById('report-other-reason').value.trim() : '',
      description: document.getElementById('report-desc').value.trim(),
      evidenceFiles: _files.map(function (f) { return { name: f.name, size: f.size, type: f.type }; }),
      context: _opts.context || '',
      submittedAt: new Date().toISOString()
    };

    // Scrape client-side chat messages from the DOM if context is 'chat'
    var clientChatLog = [];
    if (_opts.context === 'chat') {
      var chatMessages = document.getElementById('chatMessages');
      if (chatMessages) {
        var msgEls = chatMessages.querySelectorAll('.message');
        msgEls.forEach(function (el) {
          var isSent = el.classList.contains('sent');
          var textEl = el.querySelector('.message-bubble');
          var text = textEl ? textEl.textContent.trim() : '';
          if (text) {
            clientChatLog.push({
              sender: isSent ? (_opts.currentUserId || 'reporter') : _opts.reportedUserId,
              senderUsername: isSent ? 'You' : _opts.reportedUserName,
              text: text,
              createdAt: new Date().toISOString()
            });
          }
        });
      }
    }

    // Bug #1: Mock email submission to swapifyreportcenter@gmail.com
    console.log('[SwapifyReport] ─── Simulating email to: swapifyreportcenter@gmail.com ───');
    console.log('[SwapifyReport] Subject: New User Report — ' + reportData.reportedUserName);
    console.log('[SwapifyReport] Report payload:', JSON.stringify(reportData, null, 2));
    console.log('[SwapifyReport] ─── End simulated email ───');

    // Loading state
    SwapifyUI.setLoading(btn, true);
    form.querySelectorAll('input,select,textarea,button').forEach(function (el) { el.disabled = true; });

    fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportedUserId: reportData.reportedUserId,
        relatedListing: reportData.relatedListing,
        description: reportData.description,
        issueLabel: reportData.issueLabel,
        otherReason: reportData.otherReason,
        chatLog: clientChatLog
      })
    })
    .then(function (res) {
      if (!res.ok) {
        return res.json().then(function (err) { throw new Error(err.error || 'Server error'); });
      }
      return res.json();
    })
    .then(function (data) {
      renderSuccess();
      SwapifyUI.toast('Report submitted successfully', 'success');
      setTimeout(close, 3000);
    })
    .catch(function (err) {
      SwapifyUI.toast(err.message || 'Failed to submit report', 'error');
      SwapifyUI.setLoading(btn, false);
      form.querySelectorAll('input,select,textarea,button').forEach(function (el) { el.disabled = false; });
    });
  }

  /* ── SUCCESS STATE ───────────────────────────────────────── */
  function renderSuccess() {
    var body = document.getElementById('reportModalBody');
    var footer = document.getElementById('reportModalFooter');
    var title = document.getElementById('reportModalTitle');
    title.textContent = 'Report Submitted';
    body.innerHTML =
      '<div class="report-success">' +
        '<div class="report-success-icon">' +
          '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
        '</div>' +
        '<h3 style="font-size:20px;font-weight:700;margin-bottom:8px">Thank you for your report</h3>' +
        '<p style="color:var(--muted-fg);max-width:360px;margin:0 auto 24px;line-height:1.6">Our team will review your report and take appropriate action. You may be contacted for additional information.</p>' +
        '<div class="report-success-ref">' +
          '<span style="font-size:13px;color:var(--muted-fg)">Reference ID</span>' +
          '<span style="font-weight:700;font-family:var(--font-mono)">#RPT-' + Date.now().toString(36).toUpperCase() + '</span>' +
        '</div>' +
      '</div>';
    footer.innerHTML = '<button class="btn btn-primary" onclick="SwapifyReport.close()">Done</button>';
  }

  /* ── EXPOSE GLOBAL ──────────────────────────────────────── */
  window.SwapifyReport = { open: open, close: close };
})();
