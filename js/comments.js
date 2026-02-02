/**
 * Comments system for Hugo blog
 * Uses Cloudflare Workers + D1 backend with Turnstile for spam protection
 */
(function () {
  "use strict";

  // Configuration - update this to your Worker URL
  const API_BASE = "https://comments-api.hugo-cisneros.workers.dev";

  // DOM elements
  let container;
  let commentsListEl;
  let formEl;
  let turnstileSiteKey = null;
  let turnstileWidgetId = null;

  /**
   * Initialize the comments system
   */
  function init() {
    container = document.getElementById("comments-container");
    if (!container) return;

    const slug = container.dataset.slug;
    if (!slug) {
      console.error("Comments: missing data-slug attribute");
      return;
    }

    commentsListEl = document.getElementById("comments-list");
    formEl = document.getElementById("comment-form");

    if (formEl) {
      formEl.addEventListener("submit", handleSubmit);
    }

    loadComments(slug);
  }

  /**
   * Load comments from the API
   */
  async function loadComments(slug) {
    const loadingEl = document.getElementById("comments-loading");
    const errorEl = document.getElementById("comments-error");

    try {
      const response = await fetch(
        `${API_BASE}/api/comments?slug=${encodeURIComponent(slug)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Store Turnstile site key and render widget
      if (data.turnstile_site_key) {
        turnstileSiteKey = data.turnstile_site_key;
        renderTurnstile();
      }

      // Hide loading, render comments
      if (loadingEl) loadingEl.style.display = "none";

      renderComments(data.comments || []);
    } catch (err) {
      console.error("Failed to load comments:", err);
      if (loadingEl) loadingEl.style.display = "none";
      if (errorEl) {
        errorEl.textContent = "Failed to load comments. Please try again later.";
        errorEl.style.display = "block";
      }
    }
  }

  /**
   * Render comments into the list
   */
  function renderComments(comments) {
    if (!commentsListEl) return;

    if (comments.length === 0) {
      commentsListEl.innerHTML =
        '<p class="comments-empty">No comments yet. Be the first to comment!</p>';
      return;
    }

    // Build comment tree for threading
    const commentMap = new Map();
    const rootComments = [];

    comments.forEach((c) => {
      commentMap.set(c.id, { ...c, replies: [] });
    });

    comments.forEach((c) => {
      const comment = commentMap.get(c.id);
      if (c.parent_id && commentMap.has(c.parent_id)) {
        commentMap.get(c.parent_id).replies.push(comment);
      } else {
        rootComments.push(comment);
      }
    });

    commentsListEl.innerHTML = rootComments
      .map((c) => renderComment(c, 0))
      .join("");
  }

  /**
   * Render a single comment with replies
   */
  function renderComment(comment, depth) {
    const date = new Date(comment.created_at + "Z");
    const dateStr = date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const depthClass = depth > 0 ? "comment-reply" : "";
    const maxDepth = 3;
    const actualDepth = Math.min(depth, maxDepth);

    const repliesHtml =
      comment.replies && comment.replies.length > 0
        ? comment.replies.map((r) => renderComment(r, depth + 1)).join("")
        : "";

    return `
      <article class="comment ${depthClass}" style="margin-left: ${actualDepth * 1.5}rem">
        <header class="comment-header">
          <span class="comment-author">${escapeHtml(comment.author_name)}</span>
          <time class="comment-date" datetime="${comment.created_at}">${dateStr}</time>
        </header>
        <div class="comment-content">${escapeHtml(comment.content).replace(/\n/g, "<br>")}</div>
      </article>
      ${repliesHtml}
    `;
  }

  /**
   * Render Turnstile widget
   */
  function renderTurnstile() {
    const turnstileContainer = document.getElementById("turnstile-container");
    if (!turnstileContainer || !turnstileSiteKey) return;

    // Check if Turnstile script is loaded
    if (typeof turnstile !== "undefined") {
      turnstileWidgetId = turnstile.render(turnstileContainer, {
        sitekey: turnstileSiteKey,
        callback: function (token) {
          document.getElementById("turnstile-token").value = token;
        },
      });
    } else {
      // Load Turnstile script dynamically
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
      script.async = true;
      document.head.appendChild(script);

      // Global callback for when script loads
      window.onTurnstileLoad = function () {
        turnstileWidgetId = turnstile.render(turnstileContainer, {
          sitekey: turnstileSiteKey,
          callback: function (token) {
            document.getElementById("turnstile-token").value = token;
          },
        });
      };
    }
  }

  /**
   * Handle comment form submission
   */
  async function handleSubmit(e) {
    e.preventDefault();

    const submitBtn = formEl.querySelector('button[type="submit"]');
    const errorEl = document.getElementById("form-error");
    const successEl = document.getElementById("form-success");

    // Get form data
    const slug = container.dataset.slug;
    const authorName = formEl.querySelector("#comment-name").value.trim();
    const authorEmail = formEl.querySelector("#comment-email").value.trim();
    const content = formEl.querySelector("#comment-content").value.trim();
    const turnstileToken = document.getElementById("turnstile-token").value;

    // Validation
    if (!authorName) {
      showError(errorEl, "Please enter your name.");
      return;
    }

    if (!content) {
      showError(errorEl, "Please enter a comment.");
      return;
    }

    if (!turnstileToken) {
      showError(errorEl, "Please complete the verification challenge.");
      return;
    }

    // Disable form
    submitBtn.disabled = true;
    submitBtn.textContent = "Posting...";
    hideMessages(errorEl, successEl);

    try {
      const response = await fetch(`${API_BASE}/api/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page_slug: slug,
          author_name: authorName,
          author_email: authorEmail || undefined,
          content: content,
          turnstile_token: turnstileToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // Success - add the new comment to the list
      if (data.comment) {
        addCommentToList(data.comment);
      }

      // Show success message and reset form
      showSuccess(successEl, "Comment posted successfully!");
      formEl.reset();

      // Reset Turnstile
      if (turnstileWidgetId !== null && typeof turnstile !== "undefined") {
        turnstile.reset(turnstileWidgetId);
      }
      document.getElementById("turnstile-token").value = "";
    } catch (err) {
      console.error("Failed to post comment:", err);
      showError(
        errorEl,
        err.message || "Failed to post comment. Please try again."
      );

      // Reset Turnstile on error
      if (turnstileWidgetId !== null && typeof turnstile !== "undefined") {
        turnstile.reset(turnstileWidgetId);
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Post Comment";
    }
  }

  /**
   * Add a new comment to the displayed list
   */
  function addCommentToList(comment) {
    if (!commentsListEl) return;

    // Remove "no comments" message if present
    const emptyMsg = commentsListEl.querySelector(".comments-empty");
    if (emptyMsg) {
      emptyMsg.remove();
    }

    // Add the new comment at the end
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = renderComment({ ...comment, replies: [] }, 0);
    commentsListEl.appendChild(tempDiv.firstElementChild);
  }

  /**
   * Utility functions
   */
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function showError(el, message) {
    if (el) {
      el.textContent = message;
      el.style.display = "block";
    }
  }

  function showSuccess(el, message) {
    if (el) {
      el.textContent = message;
      el.style.display = "block";
    }
  }

  function hideMessages(errorEl, successEl) {
    if (errorEl) errorEl.style.display = "none";
    if (successEl) successEl.style.display = "none";
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
