const state = {
  selectedAmount: 10,
  liked: false,
  followed: false,
  rating: 4.9,
  chapter: 12,
  zoom: 1,
  route: "home",
  activeGenre: "Fantasy",
  comments: [
    {
      id: 1,
      user: "ShadowReader",
      badge: "Top Fan",
      avatar: "assets/avatar-shadow.png",
      text: "This chapter was amazing! The art, the story, everything is peak!",
      createdAt: Date.now() - 2 * 60 * 60 * 1000,
      likes: 45
    },
    {
      id: 2,
      user: "StarLight",
      badge: "Supporter",
      avatar: "assets/supporter-starlight.png",
      text: "The eclipse panel gave me chills. I need chapter 13 immediately.",
      createdAt: Date.now() - 5 * 60 * 60 * 1000,
      likes: 72
    }
  ],
  supporters: [
    { name: "StarLight", amount: 200, avatar: "assets/supporter-starlight.png" },
    { name: "MangaLover", amount: 150, avatar: "assets/supporter-manga.png" },
    { name: "DreamWalker", amount: 100, avatar: "assets/supporter-dream.png" },
    { name: "Astra", amount: 80, avatar: "assets/avatar-comment.png" },
    { name: "Nocturne", amount: 55, avatar: "assets/avatar-shadow.png" }
  ],
  uploads: []
};

const chapters = {
  10: { title: "The Black Sun Rises", page: 10, total: 30 },
  11: { title: "Ashes Over Asteria", page: 11, total: 31 },
  12: { title: "The Eclipse Reawakens", page: 12, total: 32 },
  13: { title: "Blade Beneath the Moon", page: 13, total: 34 },
  14: { title: "The Crown of Night", page: 14, total: 36 }
};

const searchItems = [
  { title: "Re: Eclipse", type: "Webtoon", action: () => selectRoute("home", "Opened Re: Eclipse.") },
  { title: "Lunaria", type: "Creator", action: () => openMenu("profile") },
  { title: "Moonlit Valkyrie", type: "Manga", action: () => toast("Moonlit Valkyrie is now in preview mode.") },
  { title: "Action", type: "Genre", action: () => selectGenre("Action") },
  { title: "Supernatural", type: "Genre", action: () => selectGenre("Supernatural") },
  { title: "Top Supporters", type: "Community", action: () => openModal(document.querySelector("#supportersModal")) }
];

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
const fallbackApiOrigin = `${location.protocol}//${location.hostname}:4174`;

async function apiRequest(path, options = {}) {
  const origins = [""];
  if (location.origin !== fallbackApiOrigin) origins.push(fallbackApiOrigin);
  let latestError = new Error("Server request failed.");

  for (const origin of origins) {
    try {
      const response = await fetch(`${origin}${path}`, {
        ...options,
        headers: { "Content-Type": "application/json", ...(options.headers || {}) }
      });
      let payload = {};

      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (response.ok) return payload;
      latestError = new Error(payload.error || "Server request failed.");
    } catch (error) {
      latestError = error;
    }
  }

  throw latestError;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function syncSearchUploads() {
  for (let index = searchItems.length - 1; index >= 0; index -= 1) {
    if (searchItems[index].type === "Draft") searchItems.splice(index, 1);
  }

  state.uploads.forEach((upload) => {
    searchItems.push({
      title: upload.title,
      type: "Draft",
      action: () => toast(`${upload.title} draft opened from the server.`)
    });
  });
}

function renderStoryState() {
  $("#likeButton").classList.toggle("active", state.liked);
  $("#likeButton").setAttribute("aria-pressed", String(state.liked));
  $("#likeCount").textContent = state.liked ? "9.5K" : "9.4K";
  $("#followButton").classList.toggle("following", state.followed);
  $("#followButton").textContent = state.followed ? "Following" : "Follow";
  $("#ratingValue").textContent = Number(state.rating).toFixed(1);
}

async function loadServerState() {
  try {
    const data = await apiRequest("/api/state");
    state.comments = data.comments || state.comments;
    state.supporters = data.supporters || state.supporters;
    state.uploads = data.uploads || [];
    state.liked = Boolean(data.story?.liked);
    state.followed = Boolean(data.story?.followed);
    state.rating = Number(data.story?.rating || 4.9);
    syncSearchUploads();
    renderStoryState();
    renderComments();
    renderSupporters();
    toast("Connected to PuffKiss server.");
  } catch (error) {
    toast(`Server unavailable: ${error.message}`);
  }
}

function toast(message) {
  const region = $("#toastRegion");
  const note = document.createElement("div");
  note.className = "toast";
  note.textContent = message;
  region.appendChild(note);
  window.setTimeout(() => {
    note.style.opacity = "0";
    note.style.transform = "translateY(8px)";
    window.setTimeout(() => note.remove(), 220);
  }, 2800);
}

function selectRoute(route, message) {
  state.route = route;
  $$(".side-link, .primary-nav button").forEach((button) => {
    button.classList.toggle("active", button.dataset.route === route);
  });
  $("#searchResults").classList.remove("open");
  const label = message || `${readable(route)} opened.`;
  toast(label);
  closePopovers();
}

function readable(value) {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function selectGenre(genre) {
  state.activeGenre = genre;
  $$("[data-genre]").forEach((button) => {
    button.classList.toggle("active", button.dataset.genre === genre);
  });
  $("#searchResults").classList.remove("open");
  toast(`${genre} stories filtered.`);
}

function closePopovers() {
  $$(".popover").forEach((popover) => popover.classList.remove("open"));
  $$("[data-menu]").forEach((button) => button.classList.remove("active"));
}

function openMenu(kind) {
  const target = kind === "profile" ? $("#profileMenu") : $("#notificationsMenu");
  const trigger = $(`[data-menu="${kind}"]`);
  const isOpen = target.classList.contains("open");
  closePopovers();
  if (!isOpen) {
    target.classList.add("open");
    trigger.classList.add("active");
  }
}

function openModal(modal) {
  $("#modalBackdrop").hidden = false;
  if (!modal.open) modal.showModal();
}

function closeModal(modal) {
  if (modal && modal.open) modal.close();
  if (!$$(".modal").some((dialog) => dialog.open)) {
    $("#modalBackdrop").hidden = true;
  }
}

function closeAllModals() {
  $$(".modal").forEach((dialog) => {
    if (dialog.open) dialog.close();
  });
  $("#modalBackdrop").hidden = true;
}

function setDonationAmount(amount) {
  const cleanAmount = Math.max(1, Math.round(Number(amount) || 1));
  state.selectedAmount = cleanAmount;
  $$("#donationGrid [data-amount]").forEach((button) => {
    button.classList.toggle("selected", Number(button.dataset.amount) === cleanAmount);
  });
  $("[data-custom]").classList.toggle(
    "selected",
    ![1, 5, 10, 20, 50, 100, 150, 200].includes(cleanAmount)
  );
  $("#donateButton").innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>
    Donate $${cleanAmount}
  `;
}

function renderSupporters() {
  const list = $("#supportersList");
  list.innerHTML = "";
  state.supporters
    .slice()
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .forEach((supporter, index) => list.appendChild(supporterRow(supporter, index)));

  const all = $("#allSupporters");
  all.innerHTML = "";
  state.supporters
    .slice()
    .sort((a, b) => b.amount - a.amount)
    .forEach((supporter, index) => all.appendChild(supporterRow(supporter, index)));
}

function supporterRow(supporter, index) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "supporter-row";
  const name = escapeHtml(supporter.name);
  const amount = Number(supporter.amount) || 0;
  row.innerHTML = `
    <span class="supporter-rank">#${index + 1}</span>
    <span><img class="supporter-avatar" src="${supporter.avatar}" alt=""> ${name}</span>
    <span class="supporter-amount">$${amount}</span>
  `;
  row.addEventListener("click", () => toast(`${supporter.name} has supported Re: Eclipse with $${amount}.`));
  return row;
}

function timeAgo(time) {
  const minutes = Math.max(1, Math.round((Date.now() - time) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function renderComments() {
  const sort = $("#sortComments").value;
  const comments = state.comments.slice();
  if (sort === "top") comments.sort((a, b) => b.likes - a.likes);
  if (sort === "oldest") comments.sort((a, b) => a.createdAt - b.createdAt);
  if (sort === "newest") comments.sort((a, b) => b.createdAt - a.createdAt);

  $("#commentsList").innerHTML = "";
  comments.forEach((comment) => {
    const item = document.createElement("article");
    item.className = "comment-item";
    const user = escapeHtml(comment.user);
    const badge = comment.badge ? `<span class="fan-pill">${escapeHtml(comment.badge)}</span>` : "";
    const text = escapeHtml(comment.text);
    item.innerHTML = `
      <img src="${comment.avatar}" alt="${user} avatar">
      <div class="comment-body">
        <strong>${user} ${badge}</strong>
        <p>${text}</p>
        <div class="comment-actions">
          <span>${timeAgo(comment.createdAt)}</span>
          <button type="button" data-reply="${user}">Reply</button>
          <button type="button" data-comment-like="${comment.id}">Like ${comment.likes}</button>
        </div>
      </div>
      <button class="comment-more" type="button" aria-label="More options" data-comment-more="${comment.id}">...</button>
    `;
    $("#commentsList").appendChild(item);
  });
  $("#commentCount").textContent = String(126 + state.comments.length);
}

function updateChapter(nextChapter) {
  const chapterNumber = Math.min(14, Math.max(10, Number(nextChapter)));
  state.chapter = chapterNumber;
  $("#chapterSelect").value = String(chapterNumber);
  $("#chapterTitle").textContent = chapters[chapterNumber].title;
  $("#currentPage").textContent = chapters[chapterNumber].page;
  $("#totalPages").textContent = chapters[chapterNumber].total;
  toast(`Chapter ${chapterNumber}: ${chapters[chapterNumber].title}`);
}

function updateReaderFit() {
  const stage = $("#readerStage");
  stage.classList.remove("compact", "original");
  const mode = $("#fitMode").value;
  if (mode !== "fit") stage.classList.add(mode);
}

function setZoom(value) {
  state.zoom = Math.min(1.45, Math.max(0.7, Number(value.toFixed(2))));
  $("#readerStage").style.setProperty("--zoom", state.zoom);
  toast(`Reader zoom ${Math.round(state.zoom * 100)}%.`);
}

function renderSearchResults(query) {
  const panel = $("#searchResults");
  const term = query.trim().toLowerCase();
  panel.innerHTML = "";
  if (!term) {
    panel.classList.remove("open");
    return;
  }

  const matches = searchItems.filter((item) => item.title.toLowerCase().includes(term));
  const visibleMatches = matches.length ? matches : [{ title: `Search for "${query}"`, type: "No exact result", action: () => toast(`No exact match for "${query}". Showing closest stories.`) }];
  visibleMatches.slice(0, 5).forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.type)}</span>`;
    button.addEventListener("click", () => {
      panel.classList.remove("open");
      $("#searchInput").value = item.title.replace(/^Search for "|\"$/g, "");
      item.action();
    });
    panel.appendChild(button);
  });
  panel.classList.add("open");
}

async function saveUpload(formData) {
  const title = formData.get("title").trim();
  const genre = formData.get("genre");
  const chapter = formData.get("chapter").trim();
  const data = await apiRequest("/api/uploads", {
    method: "POST",
    body: JSON.stringify({ title, genre, chapter })
  });
  state.uploads = data.uploads;
  syncSearchUploads();
  closeAllModals();
  selectRoute("uploads", `${title} was saved as a ${genre} draft: ${chapter}.`);
}

function setupEvents() {
  $$("[data-route]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      selectRoute(button.dataset.route);
    });
  });

  $$("[data-genre]").forEach((button) => {
    button.addEventListener("click", () => selectGenre(button.dataset.genre));
  });

  $$("[data-open-upload]").forEach((button) => {
    button.addEventListener("click", () => openModal($("#uploadModal")));
  });

  $("[data-open-creator]").addEventListener("click", () => openModal($("#creatorModal")));

  $$("[data-menu]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openMenu(button.dataset.menu);
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".popover") && !event.target.closest("[data-menu]")) {
      closePopovers();
    }
  });

  $("#moreGenres").addEventListener("click", () => {
    const extra = $("#extraGenres");
    const isOpen = extra.classList.toggle("open");
    $("#moreGenres").setAttribute("aria-expanded", String(isOpen));
    toast(isOpen ? "More genres shown." : "Extra genres hidden.");
  });

  $("#searchInput").addEventListener("input", (event) => renderSearchResults(event.target.value));
  $("#searchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const first = $("#searchResults button");
    if (first) first.click();
    else toast("Type a title, genre, or creator to search.");
  });

  $("#likeButton").addEventListener("click", async () => {
    try {
      const data = await apiRequest("/api/like", {
        method: "POST",
        body: JSON.stringify({ liked: !state.liked })
      });
      state.liked = data.liked;
      renderStoryState();
      toast(state.liked ? "Added Re: Eclipse to your likes." : "Removed like.");
    } catch (error) {
      toast(`Could not save like: ${error.message}`);
    }
  });

  $("#ratingButton").addEventListener("click", async () => {
    try {
      const data = await apiRequest("/api/rating", {
        method: "POST",
        body: JSON.stringify({ rating: 5 })
      });
      state.rating = data.rating;
      renderStoryState();
      toast("Thanks for rating Re: Eclipse 5.0.");
    } catch (error) {
      toast(`Could not save rating: ${error.message}`);
    }
  });

  $("#followButton").addEventListener("click", async () => {
    try {
      const data = await apiRequest("/api/follow", {
        method: "POST",
        body: JSON.stringify({ followed: !state.followed })
      });
      state.followed = data.followed;
      renderStoryState();
      toast(state.followed ? "You are now following Lunaria." : "You unfollowed Lunaria.");
    } catch (error) {
      toast(`Could not save follow: ${error.message}`);
    }
  });

  $("#shareButton").addEventListener("click", async () => {
    const url = `${location.href.split("#")[0]}#re-eclipse`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Share link copied.");
    } catch {
      toast(`Share link: ${url}`);
    }
  });

  $("#chapterSelect").addEventListener("change", (event) => updateChapter(event.target.value));
  $("#nextChapterTop").addEventListener("click", () => updateChapter(state.chapter + 1));
  $("#nextChapter").addEventListener("click", () => updateChapter(state.chapter + 1));
  $("#prevChapter").addEventListener("click", () => updateChapter(state.chapter - 1));
  $("#fitMode").addEventListener("change", updateReaderFit);
  $("#zoomIn").addEventListener("click", () => setZoom(state.zoom + 0.1));
  $("#zoomOut").addEventListener("click", () => setZoom(state.zoom - 0.1));
  $("#resetReader").addEventListener("click", () => {
    state.zoom = 1;
    $("#fitMode").value = "fit";
    updateReaderFit();
    $("#readerStage").style.setProperty("--zoom", "1");
    toast("Reader view reset.");
  });

  $("#donationGrid").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.custom !== undefined) {
      openModal($("#customDonationModal"));
      return;
    }
    setDonationAmount(button.dataset.amount);
  });

  $("#donateButton").addEventListener("click", async () => {
    try {
      const data = await apiRequest("/api/donations", {
        method: "POST",
        body: JSON.stringify({ amount: state.selectedAmount })
      });
      state.supporters = data.supporters;
      renderSupporters();
      toast(`Donation saved on the server: $${state.selectedAmount} sent to Lunaria.`);
    } catch (error) {
      toast(`Could not save donation: ${error.message}`);
    }
  });

  $("#viewSupporters").addEventListener("click", () => {
    renderSupporters();
    openModal($("#supportersModal"));
  });

  $("#commentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = $("#commentInput");
    const text = input.value.trim();
    if (!text) {
      toast("Write a comment before posting.");
      return;
    }
    try {
      const data = await apiRequest("/api/comments", {
        method: "POST",
        body: JSON.stringify({ text })
      });
      state.comments = data.comments;
      input.value = "";
      renderComments();
      toast("Comment posted to the server.");
    } catch (error) {
      toast(`Could not post comment: ${error.message}`);
    }
  });

  $("#commentsList").addEventListener("click", async (event) => {
    const reply = event.target.closest("[data-reply]");
    const like = event.target.closest("[data-comment-like]");
    const more = event.target.closest("[data-comment-more]");
    if (reply) {
      $("#commentInput").value = `@${reply.dataset.reply} `;
      $("#commentInput").focus();
    }
    if (like) {
      try {
        const data = await apiRequest("/api/comment-like", {
          method: "POST",
          body: JSON.stringify({ id: like.dataset.commentLike })
        });
        state.comments = data.comments;
        renderComments();
      } catch (error) {
        toast(`Could not save comment like: ${error.message}`);
      }
    }
    if (more) {
      toast("Comment options opened.");
    }
  });

  $("#sortComments").addEventListener("change", renderComments);

  $("#uploadForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await saveUpload(new FormData(event.currentTarget));
      event.currentTarget.reset();
    } catch (error) {
      toast(`Could not save upload: ${error.message}`);
    }
  });

  $("#creatorForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      await apiRequest("/api/creator", {
        method: "POST",
        body: JSON.stringify({
          creator: formData.get("creator"),
          primaryGenre: formData.get("primaryGenre"),
          supportEnabled: Boolean(formData.get("supportEnabled"))
        })
      });
      closeAllModals();
      toast("Creator profile settings saved on the server.");
    } catch (error) {
      toast(`Could not save creator profile: ${error.message}`);
    }
  });

  $("#customDonationForm").addEventListener("submit", (event) => {
    event.preventDefault();
    setDonationAmount($("#customAmountInput").value);
    closeAllModals();
  });

  $$("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => closeModal(button.closest("dialog")));
  });

  $$(".modal").forEach((dialog) => {
    dialog.addEventListener("close", () => {
      if (!$$(".modal").some((modal) => modal.open)) $("#modalBackdrop").hidden = true;
    });
  });

  $("#modalBackdrop").addEventListener("click", closeAllModals);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePopovers();
      closeAllModals();
    }
  });

  $("[data-action='signout']").addEventListener("click", () => {
    closePopovers();
    toast("Signed out of this demo session.");
  });
}

async function init() {
  renderComments();
  renderSupporters();
  renderStoryState();
  setupEvents();
  updateReaderFit();
  await loadServerState();
}

init();
