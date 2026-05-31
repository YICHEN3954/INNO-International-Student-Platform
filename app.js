const friends = [
  {
    id: 1,
    name: "Tom Chen",
    school: "Northeastern University",
    major: "Business Administration",
    grade: "Sophomore",
    nationality: "China",
    languages: ["Chinese", "English"],
    interests: ["Music", "Business", "Gaming"],
    reasons: ["Same Country", "Same Grade", "Same Major"],
    avatar: "TC",
    tone: ""
  },
  {
    id: 2,
    name: "Maya Patel",
    school: "Northeastern University",
    major: "Computer Science",
    grade: "First Year",
    nationality: "India",
    languages: ["Hindi", "English"],
    interests: ["Startups", "Cooking", "Language Exchange"],
    reasons: ["Same School", "Same Interest"],
    avatar: "MP",
    tone: "coral"
  },
  {
    id: 3,
    name: "Luis Rivera",
    school: "Northeastern University",
    major: "Marketing",
    grade: "Sophomore",
    nationality: "Mexico",
    languages: ["Spanish", "English"],
    interests: ["Soccer", "Board Games", "Music"],
    reasons: ["Same Grade", "Shared Music Interest"],
    avatar: "LR",
    tone: "gold"
  }
];

const events = [
  {
    id: 1,
    title: "International Student Mixer",
    category: "Social Event",
    location: "Student Center",
    time: "Friday 6:00 PM",
    tags: ["International Students", "Friendship", "Campus"]
  },
  {
    id: 2,
    title: "Language Exchange",
    category: "Cultural Activity",
    location: "Library Room 204",
    time: "Wednesday 5:30 PM",
    tags: ["Languages", "Conversation", "Culture"]
  },
  {
    id: 3,
    title: "Board Game Club",
    category: "Student Club",
    location: "Curry Student Center",
    time: "Saturday 3:00 PM",
    tags: ["Games", "Low Pressure", "Meetup"]
  }
];

const defaultState = {
  step: "login",
  login: {
    email: "",
    nationality: "China"
  },
  verified: false,
  profile: {
    name: "",
    school: "Northeastern University",
    major: "Business Administration",
    grade: "Sophomore",
    nationality: "China",
    languages: "Chinese, English",
    interests: "Music, Business, Gaming"
  },
  requests: {},
  activeFriendId: 1,
  messages: [
    { from: "them", text: "Hey! I saw we are both business majors." },
    { from: "me", text: "Nice to meet you. Are you going to the mixer?" }
  ],
  translationOn: false,
  joinedEvents: []
};

let state = loadState();

const screen = document.querySelector("#screen");
const requestMetric = document.querySelector("#requestMetric");
const chatMetric = document.querySelector("#chatMetric");
const eventMetric = document.querySelector("#eventMetric");

function loadState() {
  const stored = localStorage.getItem("innoPrototypeState");
  return stored ? { ...defaultState, ...JSON.parse(stored) } : structuredClone(defaultState);
}

function saveState() {
  localStorage.setItem("innoPrototypeState", JSON.stringify(state));
}

function setStep(step) {
  state.step = step;
  saveState();
  render();
}

function render() {
  document.querySelectorAll(".progress-dot").forEach((dot) => {
    dot.classList.toggle("active", dot.dataset.step === state.step);
  });

  document.querySelectorAll(".bottom-nav button").forEach((button) => {
    button.classList.toggle("active", button.dataset.nav === state.step);
  });

  const renderers = {
    login: renderLogin,
    verify: renderVerify,
    profile: renderProfile,
    friends: renderFriends,
    request: renderRequest,
    chat: renderChat,
    events: renderEvents,
    success: renderSuccess
  };

  screen.innerHTML = renderers[state.step]();
  bindScreenEvents();
  updateMetrics();
}

function updateMetrics() {
  const requestCount = Object.values(state.requests).filter(Boolean).length;
  requestMetric.textContent = requestCount;
  chatMetric.textContent = requestCount > 0 ? 1 : 0;
  eventMetric.textContent = state.joinedEvents.length;
}

function renderLogin() {
  return `
    <div class="content-stack">
      <div>
        <h2>Meet students you can trust.</h2>
        <p class="hero-copy">Start with a school email and a few identity signals, then INNO recommends students through campus context.</p>
      </div>
      <form class="form-stack" data-form="login">
        <div class="field">
          <label for="email">School email</label>
          <input id="email" name="email" type="email" value="${escapeHtml(state.login.email)}" placeholder="name@school.edu" required />
        </div>
        <div class="field">
          <label for="nationality">Nationality</label>
          <select id="nationality" name="nationality">
            ${["China", "India", "Mexico", "South Korea", "Vietnam", "United States"].map((item) => option(item, state.login.nationality)).join("")}
          </select>
        </div>
        <button class="primary-button" type="submit">Continue</button>
      </form>
    </div>
  `;
}

function renderVerify() {
  return `
    <div class="content-stack">
      <div>
        <h2>Verify student status</h2>
        <p class="hero-copy">Verification is the trust layer. The MVP simulates email verification, while student ID stays optional.</p>
      </div>
      <div class="notice">School email required. Student ID verification can be added later for stronger safety.</div>
      <div class="request-card">
        <h3>Email verification</h3>
        <p class="muted">${escapeHtml(state.login.email || "name@school.edu")}</p>
        <span class="status-pill">${state.verified ? "Verified" : "Not verified yet"}</span>
      </div>
      <div class="split-actions">
        <button class="secondary-button" type="button" data-action="back-login">Back</button>
        <button class="primary-button" type="button" data-action="verify">Verify</button>
      </div>
    </div>
  `;
}

function renderProfile() {
  const profile = state.profile;
  return `
    <form class="form-stack" data-form="profile">
      <div>
        <h2>Build your profile</h2>
        <p class="hero-copy">These fields power friend matching by major, grade, country, language, and shared interests.</p>
      </div>
      ${inputField("name", "Name", profile.name, "Your name")}
      ${inputField("school", "School", profile.school, "Northeastern University")}
      ${inputField("major", "Major", profile.major, "Business Administration")}
      <div class="field">
        <label for="grade">Grade year</label>
        <select id="grade" name="grade">
          ${["First Year", "Sophomore", "Junior", "Senior", "Graduate"].map((item) => option(item, profile.grade)).join("")}
        </select>
      </div>
      ${inputField("nationality", "Nationality", profile.nationality, "China")}
      ${inputField("languages", "Languages", profile.languages, "Chinese, English")}
      ${inputField("interests", "Interests", profile.interests, "Music, Business, Gaming")}
      <button class="primary-button" type="submit">Save profile</button>
    </form>
  `;
}

function renderFriends() {
  return `
    <div class="content-stack">
      <div>
        <h2>Recommended friends</h2>
        <p class="hero-copy">Each card explains why the match might feel natural before a request is sent.</p>
      </div>
      ${friends.map(renderFriendCard).join("")}
    </div>
  `;
}

function renderFriendCard(friend) {
  const status = state.requests[friend.id];
  return `
    <article class="friend-card">
      <div class="friend-head">
        <div class="avatar ${friend.tone}">${friend.avatar}</div>
        <div>
          <h3>${friend.name}</h3>
          <p class="muted">${friend.major} · ${friend.grade}</p>
        </div>
      </div>
      <div class="tag-row">
        ${friend.reasons.map((reason) => `<span class="tag">${reason}</span>`).join("")}
      </div>
      <p class="muted">${friend.nationality} · ${friend.languages.join(", ")} · ${friend.interests.join(", ")}</p>
      <button class="${status ? "secondary-button" : "primary-button"}" type="button" data-action="request" data-id="${friend.id}">
        ${status ? status : "Add friend"}
      </button>
    </article>
  `;
}

function renderRequest() {
  const friend = getActiveFriend();
  const status = state.requests[friend.id] || "Pending";
  return `
    <div class="content-stack">
      <div>
        <h2>Friend request</h2>
        <p class="hero-copy">Chat unlocks only after mutual consent. This keeps the interaction safer and less random.</p>
      </div>
      <div class="request-card">
        <div class="friend-head">
          <div class="avatar ${friend.tone}">${friend.avatar}</div>
          <div>
            <h3>${friend.name}</h3>
            <p class="muted">${friend.major} · ${friend.grade}</p>
          </div>
        </div>
        <div class="tag-row"><span class="status-pill">${status}</span></div>
      </div>
      <div class="split-actions">
        <button class="secondary-button" type="button" data-action="decline">Decline</button>
        <button class="primary-button" type="button" data-action="accept">Accept</button>
      </div>
    </div>
  `;
}

function renderChat() {
  const friend = getActiveFriend();
  const accepted = state.requests[friend.id] === "Accepted";

  if (!accepted) {
    return `
      <div class="content-stack">
        <h2>Chat</h2>
        <p class="hero-copy">Send or accept a friend request before starting a conversation.</p>
        <button class="primary-button" type="button" data-action="go-friends">Find friends</button>
      </div>
    `;
  }

  return `
    <div class="content-stack">
      <div>
        <h2>${friend.name}</h2>
        <p class="hero-copy">Verified student · ${friend.major}</p>
      </div>
      <div class="message-card">
        <div class="chat-window">
          ${state.messages.map(renderMessage).join("")}
        </div>
        <form class="chat-input-row" data-form="message">
          <input name="message" placeholder="Write a message" autocomplete="off" />
          <button class="primary-button" type="submit" aria-label="Send" title="Send">➤</button>
        </form>
      </div>
      <div class="split-actions">
        <button class="secondary-button" type="button" data-action="translate">${state.translationOn ? "Hide translation" : "Translate"}</button>
        <button class="secondary-button" type="button" data-action="report">Report</button>
      </div>
    </div>
  `;
}

function renderMessage(message) {
  const translation = state.translationOn && message.from === "them"
    ? `<small class="muted">Translation: We have the same major. Want to meet at the student mixer?</small>`
    : "";
  return `<div class="bubble ${message.from}">${escapeHtml(message.text)}${translation}</div>`;
}

function renderEvents() {
  return `
    <div class="content-stack">
      <div>
        <h2>Campus events</h2>
        <p class="hero-copy">Events help the online match turn into a real campus friendship.</p>
      </div>
      ${events.map(renderEventCard).join("")}
    </div>
  `;
}

function renderEventCard(event) {
  const joined = state.joinedEvents.includes(event.id);
  return `
    <article class="event-card">
      <div class="event-head">
        <div class="avatar gold">EV</div>
        <div>
          <h3>${event.title}</h3>
          <p class="muted">${event.category} · ${event.time}</p>
        </div>
      </div>
      <p class="muted">${event.location}</p>
      <div class="tag-row">
        ${event.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
      </div>
      <button class="${joined ? "secondary-button" : "primary-button"}" type="button" data-action="join-event" data-id="${event.id}">
        ${joined ? "Joined" : "Join event"}
      </button>
    </article>
  `;
}

function renderSuccess() {
  return `
    <div class="content-stack">
      <div>
        <h2>You joined an event.</h2>
        <p class="hero-copy">This is INNO's final value: verified match, safer chat, campus activity, and offline friendship.</p>
      </div>
      <div class="notice">Meet offline, build your social circle, and keep discovering students through school-based contexts.</div>
      <button class="primary-button" type="button" data-action="go-events">Browse more events</button>
    </div>
  `;
}

function bindScreenEvents() {
  screen.querySelector('[data-form="login"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state.login.email = data.get("email").toString();
    state.login.nationality = data.get("nationality").toString();
    state.profile.nationality = state.login.nationality;
    setStep("verify");
  });

  screen.querySelector('[data-form="profile"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state.profile = Object.fromEntries(data.entries());
    setStep("friends");
  });

  screen.querySelector('[data-form="message"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = event.currentTarget.elements.message;
    const text = input.value.trim();
    if (!text) return;
    state.messages.push({ from: "me", text });
    input.value = "";
    saveState();
    render();
  });

  screen.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action, button.dataset.id));
  });
}

function handleAction(action, id) {
  if (action === "back-login") setStep("login");
  if (action === "verify") {
    state.verified = true;
    setStep("profile");
  }
  if (action === "request") {
    state.activeFriendId = Number(id);
    state.requests[id] = "Pending";
    setStep("request");
  }
  if (action === "accept") {
    state.requests[state.activeFriendId] = "Accepted";
    setStep("chat");
  }
  if (action === "decline") {
    state.requests[state.activeFriendId] = "Declined";
    setStep("friends");
  }
  if (action === "go-friends") setStep("friends");
  if (action === "translate") {
    state.translationOn = !state.translationOn;
    saveState();
    render();
  }
  if (action === "report") {
    alert("Report submitted in prototype mode.");
  }
  if (action === "join-event") {
    const eventId = Number(id);
    if (!state.joinedEvents.includes(eventId)) state.joinedEvents.push(eventId);
    setStep("success");
  }
  if (action === "go-events") setStep("events");
}

function getActiveFriend() {
  return friends.find((friend) => friend.id === state.activeFriendId) || friends[0];
}

function inputField(name, label, value, placeholder) {
  return `
    <div class="field">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" value="${escapeHtml(value)}" placeholder="${placeholder}" required />
    </div>
  `;
}

function option(value, selected) {
  return `<option value="${value}" ${value === selected ? "selected" : ""}>${value}</option>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.querySelector("#resetButton").addEventListener("click", () => {
  localStorage.removeItem("innoPrototypeState");
  state = structuredClone(defaultState);
  render();
});

document.querySelectorAll(".bottom-nav button").forEach((button) => {
  button.addEventListener("click", () => setStep(button.dataset.nav));
});

render();
