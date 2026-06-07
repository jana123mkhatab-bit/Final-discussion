/**
 * @file realtime-validation.js
 * @description Client-side real-time form validation for Swapify.
 *
 * Attaches `input` and `blur` event listeners to registration
 * and item-creation form fields, providing instant visual
 * feedback (green/red borders + inline error messages) as the
 * user types.
 *
 * CSS classes used:
 *   .valid   → green border  (already defined in login.ejs styles)
 *   .invalid → red border    (already defined in login.ejs styles)
 *
 * Error text targets:
 *   Registration: .ferr spans (#regNameErr, #regEmailErr, etc.)
 *   Add-item:     .form-error spans (#titleError, #descError)
 */
(function () {
  'use strict';

  // ── Helpers ──────────────────────────────────────────────
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * Set field state to valid, invalid, or neutral.
   * @param {HTMLElement} input  — the input/textarea element
   * @param {HTMLElement|null} errEl — the error message span
   * @param {'valid'|'invalid'|'neutral'} state
   * @param {string} [message] — error message (only for invalid)
   */
  function setState(input, errEl, state, message) {
    if (!input) return;
    input.classList.remove('valid', 'invalid');
    if (state === 'valid') {
      input.classList.add('valid');
    } else if (state === 'invalid') {
      input.classList.add('invalid');
    }
    if (errEl) {
      errEl.textContent = state === 'invalid' ? (message || '') : '';
    }
  }

  /**
   * Attach real-time validation to a field.
   * @param {string} inputId   — DOM id of the input
   * @param {string} errId     — DOM id of the error span
   * @param {function} validate — returns {valid: bool, message: string}
   */
  function attachValidator(inputId, errId, validate) {
    var input = document.getElementById(inputId);
    var errEl = document.getElementById(errId);
    if (!input) return;

    function run() {
      var val = input.value;
      // Don't validate empty fields until blur
      if (val.length === 0) {
        setState(input, errEl, 'neutral');
        return;
      }
      var result = validate(val);
      setState(input, errEl, result.valid ? 'valid' : 'invalid', result.message);
    }

    input.addEventListener('input', run);
    input.addEventListener('blur', function () {
      // On blur, validate even if empty (mark required)
      var val = input.value;
      if (val.length === 0) {
        setState(input, errEl, 'invalid', 'This field is required.');
        return;
      }
      var result = validate(val);
      setState(input, errEl, result.valid ? 'valid' : 'invalid', result.message);
    });
  }

  // ── Registration Form Validators ─────────────────────────

  // Username (regName → regNameErr)
  attachValidator('regName', 'regNameErr', function (val) {
    if (val.trim().length < 3) {
      return { valid: false, message: 'Username must be at least 3 characters.' };
    }
    return { valid: true };
  });

  // Email (regEmail → regEmailErr)
  attachValidator('regEmail', 'regEmailErr', function (val) {
    if (!EMAIL_RE.test(val)) {
      return { valid: false, message: 'Please enter a valid email address.' };
    }
    return { valid: true };
  });

  // Password (regPassword → regPasswordErr)
  attachValidator('regPassword', 'regPasswordErr', function (val) {
    var missing = [];
    if (!val || val.length < 10) missing.push('Minimum 10 characters');
    if (!/[A-Z]/.test(val || '')) missing.push('At least one uppercase letter');
    if (!/[a-z]/.test(val || '')) missing.push('At least one lowercase letter');
    if (!/[0-9]/.test(val || '')) missing.push('At least one number');
    if (!/[^a-zA-Z0-9]/.test(val || '')) missing.push('At least one special character');
    if (missing.length > 0) {
      return { valid: false, message: 'Password must include:\n• ' + missing.join('\n• ') };
    }
    return { valid: true };
  });

  // Confirm Password (regConfirm → regConfirmErr)
  (function () {
    var confirmInput = document.getElementById('regConfirm');
    var confirmErr   = document.getElementById('regConfirmErr');
    var passwordInput = document.getElementById('regPassword');
    if (!confirmInput || !passwordInput) return;

    function validate() {
      var val  = confirmInput.value;
      var pass = passwordInput.value;
      if (val.length === 0) {
        setState(confirmInput, confirmErr, 'neutral');
        return;
      }
      if (val !== pass) {
        setState(confirmInput, confirmErr, 'invalid', 'Passwords do not match.');
      } else {
        setState(confirmInput, confirmErr, 'valid');
      }
    }

    confirmInput.addEventListener('input', validate);
    confirmInput.addEventListener('blur', validate);
    // Also re-validate when the password field changes
    passwordInput.addEventListener('input', validate);
  })();

  // ── Login Form Validators ────────────────────────────────

  // Login Email (loginEmail → loginEmailErr)
  attachValidator('loginEmail', 'loginEmailErr', function (val) {
    if (!EMAIL_RE.test(val)) {
      return { valid: false, message: 'Please enter a valid email address.' };
    }
    return { valid: true };
  });

  // Login Password (loginPassword → loginPasswordErr)
  attachValidator('loginPassword', 'loginPasswordErr', function (val) {
    if (val.length < 1) {
      return { valid: false, message: 'Password is required.' };
    }
    return { valid: true };
  });

  // ── Add Item Form Validators ─────────────────────────────

  // Title (itemTitle → titleError)
  attachValidator('itemTitle', 'titleError', function (val) {
    if (val.trim().length < 3) {
      return { valid: false, message: 'Title must be at least 3 characters.' };
    }
    return { valid: true };
  });

  // Description (itemDesc → descError)
  attachValidator('itemDesc', 'descError', function (val) {
    if (val.trim().length === 0) {
      return { valid: false, message: 'Description is required.' };
    }
    return { valid: true };
  });

})();
