import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getDatabase,
  get,
  onValue,
  push,
  ref,
  serverTimestamp,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBmfM5u_DRGNi5PW6wcDqknjrc9CS50Z0Q",
  authDomain: "inno-ff99c.firebaseapp.com",
  databaseURL: "https://inno-ff99c-default-rtdb.firebaseio.com",
  projectId: "inno-ff99c",
  storageBucket: "inno-ff99c.firebasestorage.app",
  messagingSenderId: "997918724362",
  appId: "1:997918724362:web:7ad248a75aa709698e6af3",
  measurementId: "G-6CYMTZD9S2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

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

const defaultMessages = [
  { from: "them", text: "Hey! I saw we are both business majors.", createdAt: 1 },
  { from: "me", text: "Nice to meet you. Are you going to the mixer?", createdAt: 2 }
];

const defaultCloudState = {
  login: { email: "", nationality: "China" },
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
  joinedEvents: []
};

const localDefaults = {
  step: "login",
  translationOn: false,
  authMode: "login"
};

let userId = null;
let currentUser = null;
let authLoading = true;
let authError = "";
let pendingSignupNationality = "";
let state = {
  ...structuredClone(defaultCloudState),
  ...loadLocalPrefs(),
  messages: structuredClone(defaultMessages)
};
let cloudStatus = "Connecting";
let cloudError = "";
let unsubscribeUser = null;
let unsubscribeMessages = null;

const screen = document.querySelector("#screen");
const requestMetric = document.querySelector("#requestMetric");
const chatMetric = document.querySelector("#chatMetric");
const eventMetric = document.querySelector("#eventMetric");
const cloudMetric = document.querySelector("#cloudMetric");

onAuthStateChanged(auth, async (user) => {
  authLoading = false;
  currentUser = user;
  authError = "";

  if (!user) {
    userId = null;
    cleanupFirebaseSync();
    cloudStatus = "Signed out";
    state = {
      ...structuredClone(defaultCloudState),
      ...loadLocalPrefs(),
      messages: structuredClone(defaultMessages)
    };
    render();
    return;
  }

  userId = user.uid;
  cloudStatus = "Connecting";
  await startFirebaseSync();
});

render();

async function startFirebaseSync() {
  try {
    await seedUserIfNeeded();
    subscribeToUser();
    subscribeToMessages(state.activeFriendId);
  } catch (error) {
    setCloudError(error);
  }
}

async function seedUserIfNeeded() {
  const userSnapshot = await get(ref(db, `users/${userId}`));
  if (userSnapshot.exists()) return;

  const legacyState = loadLegacyState();
  const firstCloudState = {
    ...structuredClone(defaultCloudState),
    ...pickCloudFields(legacyState),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await set(ref(db, `users/${userId}`), firstCloudState);

  const legacyMessages = Array.isArray(legacyState?.messages) && legacyState.messages.length
    ? legacyState.messages
    : defaultMessages;
  await set(ref(db, `chats/${userId}/friends/1/messages`), objectFromArray(legacyMessages));
}

function subscribeToUser() {
  unsubscribeUser?.();
  unsubscribeUser = onValue(
    ref(db, `users/${userId}`),
    (snapshot) => {
      const cloudState = snapshot.val() || {};
      state = { ...state, ...mergeCloudState(cloudState) };
      cloudStatus = "Connected";
      cloudError = "";
      saveLocalPrefs();
      render();
    },
    setCloudError
  );
}

function subscribeToMessages(friendId) {
  unsubscribeMessages?.();
  unsubscribeMessages = onValue(
    ref(db, `chats/${userId}/friends/${friendId}/messages`),
    async (snapshot) => {
      const values = snapshot.val();
      if (!values) {
        await set(ref(db, `chats/${userId}/friends/${friendId}/messages`), objectFromArray(defaultMessages));
        return;
      }

      state.messages = Object.values(values).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      cloudStatus = "Connected";
      cloudError = "";
      render();
    },
    setCloudError
  );
}

function cleanupFirebaseSync() {
  unsubscribeUser?.();
  unsubscribeMessages?.();
  unsubscribeUser = null;
  unsubscribeMessages = null;
}

function setCloudError(error) {
  cloudStatus = "Offline";
  cloudError = error?.message || "Firebase is not reachable.";
  render();
}

function loadLocalPrefs() {
  const stored = localStorage.getItem("innoLocalPrefs");
  return stored ? { ...localDefaults, ...JSON.parse(stored) } : structuredClone(localDefaults);
}

function saveLocalPrefs() {
  localStorage.setItem("innoLocalPrefs", JSON.stringify({
    step: state.step,
    translationOn: state.translationOn,
    authMode: state.authMode
  }));
}

function loadLegacyState() {
  const stored = localStorage.getItem("innoPrototypeState");
  return stored ? JSON.parse(stored) : {};
}

function pickCloudFields(source = {}) {
  const signupNationality = pendingSignupNationality || source.login?.nationality;
  const email = currentUser?.email || source.login?.email || "";
  return {
    login: {
      email,
      nationality: signupNationality || defaultCloudState.login.nationality
    },
    verified: Boolean(source.verified),
    profile: {
      ...defaultCloudState.profile,
      ...(source.profile || {}),
      nationality: source.profile?.nationality || signupNationality || defaultCloudState.profile.nationality
    },
    requests: source.requests || {},
    activeFriendId: Number(source.activeFriendId || 1),
    joinedEvents: Array.isArray(source.joinedEvents) ? source.joinedEvents : []
  };
}

function mergeCloudState(cloudState) {
  const picked = pickCloudFields(cloudState);
  return {
    ...picked,
    requests: picked.requests || {},
    joinedEvents: Array.isArray(picked.joinedEvents) ? picked.joinedEvents : []
  };
}

function objectFromArray(items) {
  return items.reduce((acc, item, index) => {
    acc[`seed_${index}`] = item;
    return acc;
  }, {});
}

async function saveUserPatch(patch) {
  if (!userId) return;
  state = { ...state, ...patch };
  saveLocalPrefs();
  render();

  try {
    await update(ref(db, `users/${userId}`), {
      ...patch,
      updatedAt: serverTimestamp()
    });
    cloudStatus = "Connected";
    cloudError = "";
  } catch (error) {
    setCloudError(error);
  }
}

async function setStep(step) {
  state.step = step;
  saveLocalPrefs();
  render();
}

function render() {
  if (!screen) return;

  document.querySelectorAll(".progress-dot").forEach((dot) => {
    dot.classList.toggle("active", dot.dataset.step === state.step);
  });

  document.querySelectorAll(".bottom-nav button").forEach((button) => {
    button.classList.toggle("active", button.dataset.nav === state.step);
  });

  if (authLoading) {
    screen.innerHTML = renderAuthLoading();
    updateMetrics();
    return;
  }

  if (!currentUser) {
    screen.innerHTML = renderAuth();
    bindAuthEvents();
    updateMetrics();
    return;
  }

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
  const requestCount = Object.values(state.requests || {}).filter(Boolean).length;
  requestMetric.textContent = requestCount;
  chatMetric.textContent = requestCount > 0 ? 1 : 0;
  eventMetric.textContent = state.joinedEvents.length;
  cloudMetric.textContent = authError || cloudError ? "Needs attention" : cloudStatus;
}

function renderAuthLoading() {
  return `
    <div class="content-stack">
      <div>
        <h2>Opening INNO</h2>
        <p class="hero-copy">Checking whether you already have an active email session.</p>
      </div>
      <div class="notice">Connecting to Firebase Authentication...</div>
    </div>
  `;
}

function renderAuth() {
  const isSignup = state.authMode === "signup";
  return `
    <div class="content-stack">
      <div>
        <h2>${isSignup ? "Create your account" : "Log in with email"}</h2>
        <p class="hero-copy">Your account now controls your cloud profile, friend requests, chats, and event sign-ups.</p>
      </div>
      <div class="segmented-control" role="group" aria-label="Authentication mode">
        <button class="${!isSignup ? "active" : ""}" type="button" data-auth-mode="login">Login</button>
        <button class="${isSignup ? "active" : ""}" type="button" data-auth-mode="signup">Sign Up</button>
      </div>
      ${authError ? `<div class="notice">${escapeHtml(authError)}</div>` : ""}
      <form class="form-stack" data-form="auth">
        <div class="field">
          <label for="authEmail">Email</label>
          <input id="authEmail" name="email" type="email" value="${escapeHtml(state.login.email)}" placeholder="name@school.edu" required />
        </div>
        <div class="field">
          <label for="authPassword">Password</label>
          <input id="authPassword" name="password" type="password" minlength="6" placeholder="At least 6 characters" required />
        </div>
        ${isSignup ? `
          <div class="field">
            <label for="authNationality">Nationality</label>
            <select id="authNationality" name="nationality">
              ${["China", "India", "Mexico", "South Korea", "Vietnam", "United States"].map((item) => option(item, state.login.nationality)).join("")}
            </select>
          </div>
        ` : ""}
        <button class="primary-button" type="submit">${isSignup ? "Create account" : "Login"}</button>
      </form>
    </div>
  `;
}

function renderLogin() {
  return `
    <div class="content-stack">
      <div>
        <h2>Meet students you can trust.</h2>
        <p class="hero-copy">Start with a school email and a few identity signals, then INNO recommends students through campus context.</p>
      </div>
      ${renderCloudNotice()}
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
        <p class="hero-copy">Verification is the trust layer. The MVP simulates email verification and stores that state in Firebase.</p>
      </div>
      ${renderCloudNotice()}
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
        <p class="hero-copy">Profile changes are now saved to Firebase Realtime Database.</p>
      </div>
      ${renderCloudNotice()}
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
      <button class="secondary-button" type="button" data-action="logout">Logout</button>
    </form>
  `;
}

function renderFriends() {
  return `
    <div class="content-stack">
      <div>
        <h2>Recommended friends</h2>
        <p class="hero-copy">Mock users stay local for now, while requests are saved to Firebase.</p>
      </div>
      ${renderCloudNotice()}
      ${friends.map(renderFriendCard).join("")}
    </div>
  `;
}

function renderFriendCard(friend) {
  const status = state.requests?.[friend.id];
  return `
    <article class="friend-card">
      <div class="friend-head">
        <div class="avatar ${friend.tone}">${friend.avatar}</div>
        <div>
          <h3>${friend.name}</h3>
          <p class="muted">${friend.major} | ${friend.grade}</p>
        </div>
      </div>
      <div class="tag-row">
        ${friend.reasons.map((reason) => `<span class="tag">${reason}</span>`).join("")}
      </div>
      <p class="muted">${friend.nationality} | ${friend.languages.join(", ")} | ${friend.interests.join(", ")}</p>
      <button class="${status ? "secondary-button" : "primary-button"}" type="button" data-action="request" data-id="${friend.id}">
        ${status ? status : "Add friend"}
      </button>
    </article>
  `;
}

function renderRequest() {
  const friend = getActiveFriend();
  const status = state.requests?.[friend.id] || "Pending";
  return `
    <div class="content-stack">
      <div>
        <h2>Friend request</h2>
        <p class="hero-copy">Chat unlocks only after mutual consent. Request status is now cloud-backed.</p>
      </div>
      ${renderCloudNotice()}
      <div class="request-card">
        <div class="friend-head">
          <div class="avatar ${friend.tone}">${friend.avatar}</div>
          <div>
            <h3>${friend.name}</h3>
            <p class="muted">${friend.major} | ${friend.grade}</p>
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
  const accepted = state.requests?.[friend.id] === "Accepted";

  if (!accepted) {
    return `
      <div class="content-stack">
        <h2>Chat</h2>
        <p class="hero-copy">Send or accept a friend request before starting a conversation.</p>
        ${renderCloudNotice()}
        <button class="primary-button" type="button" data-action="go-friends">Find friends</button>
      </div>
    `;
  }

  return `
    <div class="content-stack">
      <div>
        <h2>${friend.name}</h2>
        <p class="hero-copy">Verified student | ${friend.major}</p>
      </div>
      ${renderCloudNotice()}
      <div class="message-card">
        <div class="chat-window">
          ${state.messages.map(renderMessage).join("")}
        </div>
        <form class="chat-input-row" data-form="message">
          <input name="message" placeholder="Write a message" autocomplete="off" />
          <button class="primary-button" type="submit" aria-label="Send" title="Send">Send</button>
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
        <p class="hero-copy">Events are still mock data. The user's joined events are saved to Firebase.</p>
      </div>
      ${renderCloudNotice()}
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
          <p class="muted">${event.category} | ${event.time}</p>
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
      ${renderCloudNotice()}
      <div class="notice">Meet offline, build your social circle, and keep discovering students through school-based contexts.</div>
      <button class="primary-button" type="button" data-action="go-events">Browse more events</button>
    </div>
  `;
}

function renderCloudNotice() {
  if (!cloudError) return "";
  return `<div class="notice">Firebase sync problem: ${escapeHtml(cloudError)}</div>`;
}

function bindScreenEvents() {
  screen.querySelector('[data-form="login"]')?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const login = {
      email: data.get("email").toString(),
      nationality: data.get("nationality").toString()
    };
    await saveUserPatch({
      login,
      profile: { ...state.profile, nationality: login.nationality }
    });
    await setStep("verify");
  });

  screen.querySelector('[data-form="profile"]')?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await saveUserPatch({ profile: Object.fromEntries(data.entries()) });
    await setStep("friends");
  });

  screen.querySelector('[data-form="message"]')?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = event.currentTarget.elements.message;
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    state.messages.push({ from: "me", text, createdAt: Date.now() });
    render();

    try {
      await push(ref(db, `chats/${userId}/friends/${state.activeFriendId}/messages`), {
        from: "me",
        text,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      setCloudError(error);
    }
  });

  screen.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action, button.dataset.id));
  });
}

function bindAuthEvents() {
  screen.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.authMode = button.dataset.authMode;
      authError = "";
      saveLocalPrefs();
      render();
    });
  });

  screen.querySelector('[data-form="auth"]')?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = data.get("email").toString().trim();
    const password = data.get("password").toString();
    const nationality = data.get("nationality")?.toString() || state.login.nationality;

    authError = "";
    pendingSignupNationality = nationality;
    state.login = { email, nationality };
    saveLocalPrefs();
    render();

    try {
      if (state.authMode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      authError = readableAuthError(error);
      render();
    }
  });
}

async function handleAction(action, id) {
  if (action === "back-login") await setStep("login");
  if (action === "verify") {
    await saveUserPatch({ verified: true });
    await setStep("profile");
  }
  if (action === "request") {
    const friendId = Number(id);
    await saveUserPatch({
      activeFriendId: friendId,
      requests: { ...state.requests, [friendId]: "Pending" }
    });
    subscribeToMessages(friendId);
    await setStep("request");
  }
  if (action === "accept") {
    await saveUserPatch({
      requests: { ...state.requests, [state.activeFriendId]: "Accepted" }
    });
    await setStep("chat");
  }
  if (action === "decline") {
    await saveUserPatch({
      requests: { ...state.requests, [state.activeFriendId]: "Declined" }
    });
    await setStep("friends");
  }
  if (action === "go-friends") await setStep("friends");
  if (action === "translate") {
    state.translationOn = !state.translationOn;
    saveLocalPrefs();
    render();
  }
  if (action === "report") {
    try {
      await push(ref(db, `reports/${userId}`), {
        friendId: state.activeFriendId,
        createdAt: serverTimestamp(),
        status: "prototype-submitted"
      });
      alert("Report submitted to Firebase in prototype mode.");
    } catch (error) {
      setCloudError(error);
    }
  }
  if (action === "join-event") {
    const eventId = Number(id);
    const joinedEvents = state.joinedEvents.includes(eventId)
      ? state.joinedEvents
      : [...state.joinedEvents, eventId];
    await saveUserPatch({ joinedEvents });
    await setStep("success");
  }
  if (action === "go-events") await setStep("events");
  if (action === "logout") {
    await signOut(auth);
    await setStep("login");
  }
}

function readableAuthError(error) {
  const code = error?.code || "";
  if (code.includes("email-already-in-use")) return "This email already has an INNO account. Try Login instead.";
  if (code.includes("invalid-credential") || code.includes("wrong-password")) return "Email or password is incorrect.";
  if (code.includes("user-not-found")) return "No account found for this email. Try Sign Up first.";
  if (code.includes("weak-password")) return "Password should be at least 6 characters.";
  if (code.includes("invalid-email")) return "Please enter a valid email address.";
  if (code.includes("operation-not-allowed")) return "Email/password login is not enabled in Firebase Authentication yet.";
  return error?.message || "Authentication failed. Please try again.";
}

function getActiveFriend() {
  return friends.find((friend) => friend.id === Number(state.activeFriendId)) || friends[0];
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

document.querySelector("#resetButton").addEventListener("click", async () => {
  if (!userId) return;
  localStorage.removeItem("innoPrototypeState");
  localStorage.removeItem("innoLocalPrefs");
  await set(ref(db, `users/${userId}`), {
    ...structuredClone(defaultCloudState),
    resetAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await set(ref(db, `chats/${userId}/friends/1/messages`), objectFromArray(defaultMessages));
  state = {
    ...structuredClone(defaultCloudState),
    ...structuredClone(localDefaults),
    messages: structuredClone(defaultMessages)
  };
  subscribeToMessages(1);
  render();
});

document.querySelectorAll(".bottom-nav button").forEach((button) => {
  button.addEventListener("click", async () => setStep(button.dataset.nav));
});
