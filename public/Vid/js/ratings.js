(function () {
  'use strict';

  function setMessage(el, text, tone) {
    if (!el) return;
    el.textContent = text || '';
    el.dataset.tone = tone || '';
  }

  function updateSummary(summaryEl, avg, count) {
    if (!summaryEl) return;
    var avgText = (Math.round(avg * 10) / 10).toFixed(1);
    summaryEl.textContent = count > 0 ? avgText + ' (' + count + ')' : avgText;
  }

  function initRatingBox(box) {
    var targetId = box.dataset.targetId;
    var targetModel = box.dataset.targetModel;
    var ownerId = box.dataset.ownerId || '';
    var currentUserId = box.dataset.currentUserId || '';
    var isLoggedIn = box.dataset.isLoggedIn === 'true';

    if (!targetId || !targetModel) return;

    var stars = Array.prototype.slice.call(box.querySelectorAll('[data-score]'));
    var avgEl = box.querySelector('[data-rating-avg]');
    var countEl = box.querySelector('[data-rating-count]');
    var msgEl = box.querySelector('[data-rating-msg]');
    var submitBtn = box.querySelector('[data-rating-submit]');
    var commentEl = box.querySelector('[data-rating-comment]');
    var summaryEl = document.getElementById('detailRating') || document.getElementById('skillRating');

    var currentScore = 0;
    var disabled = false;

    function setDisabled(value) {
      disabled = value;
      stars.forEach(function (btn) { btn.disabled = value; });
      if (submitBtn) submitBtn.disabled = value;
      if (commentEl) commentEl.disabled = value;
    }

    function renderStars(score) {
      stars.forEach(function (btn) {
        var starScore = parseInt(btn.dataset.score, 10);
        btn.classList.toggle('active', starScore <= score);
      });
    }

    stars.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (disabled) return;
        var value = parseInt(btn.dataset.score, 10);
        if (!value) return;
        currentScore = value;
        renderStars(currentScore);
      });
    });

    if (!isLoggedIn) {
      setDisabled(true);
      setMessage(msgEl, 'Log in to rate this listing.', 'info');
    } else if (currentUserId && ownerId && currentUserId === ownerId) {
      setDisabled(true);
      setMessage(msgEl, 'You cannot rate your own listing.', 'warning');
    }

    fetch('/api/ratings/' + encodeURIComponent(targetId) + '?model=' + encodeURIComponent(targetModel), {
      credentials: 'same-origin'
    })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !data.success) return;
        var avg = data.rating ? data.rating.average : 0;
        var count = data.rating ? data.rating.count : 0;
        if (avgEl) avgEl.textContent = (Math.round(avg * 10) / 10).toFixed(1);
        if (countEl) countEl.textContent = String(count || 0);
        updateSummary(summaryEl, avg, count);

        if (data.userRating && data.userRating.score) {
          currentScore = data.userRating.score;
          renderStars(currentScore);
          if (commentEl) commentEl.value = data.userRating.comment || '';
        }

        if (data.canRate === false) {
          setDisabled(true);
          setMessage(msgEl, data.reason || 'Rating is not available yet.', 'info');
        } else if (data.canRate === true && isLoggedIn && !(currentUserId && ownerId && currentUserId === ownerId)) {
          setDisabled(false);
        }
      })
      .catch(function () {});

    if (!submitBtn) return;

    submitBtn.addEventListener('click', function () {
      if (!isLoggedIn) {
        window.location.href = '/login';
        return;
      }
      if (disabled) return;
      if (!currentScore) {
        setMessage(msgEl, 'Select a rating first.', 'error');
        return;
      }

      submitBtn.disabled = true;

      fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          targetId: targetId,
          targetModel: targetModel,
          score: currentScore,
          comment: commentEl ? commentEl.value.trim() : ''
        })
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (!data || !data.success) {
            setMessage(msgEl, (data && data.error) ? data.error : 'Failed to save rating.', 'error');
            return;
          }
          var avg = data.average || 0;
          var count = data.count || 0;
          if (avgEl) avgEl.textContent = (Math.round(avg * 10) / 10).toFixed(1);
          if (countEl) countEl.textContent = String(count || 0);
          updateSummary(summaryEl, avg, count);
          setMessage(msgEl, 'Rating submitted!', 'success');
          if (window.SwapifyUI && window.SwapifyUI.toast) {
            window.SwapifyUI.toast('Rating submitted', 'success');
          }
          currentScore = 0;
          renderStars(currentScore);
          if (commentEl) commentEl.value = '';
        })
        .catch(function () {
          setMessage(msgEl, 'Network error. Try again.', 'error');
        })
        .finally(function () {
          submitBtn.disabled = disabled;
        });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-rating-box]').forEach(initRatingBox);
  });
})();
