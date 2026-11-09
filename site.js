const KEY = "hfn-progress-v1";
function readProgress() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function paintScores() {
  const all = readProgress();
  const cards = document.querySelectorAll("[data-score]");
  let passed = 0;
  cards.forEach((card) => {
    const score = all[card.dataset.score];
    const el = card.querySelector(".score");
    if (!el) return;
    if (score) {
      el.textContent = score.correct + "/" + score.total;
      if (score.passed) passed += 1;
    }
  });
  const line = document.getElementById("passed");
  if (line) line.textContent = passed + " of " + cards.length + " checks passed in this browser.";
}
paintScores();

document.querySelectorAll(".quiz").forEach((root) => {
  const slug = root.dataset.slug;
  const questions = [...root.querySelectorAll(".q")];
  const grade = root.querySelector(".grade");
  questions.forEach((q) => {
    q.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        q.querySelectorAll("button").forEach((b) => b.classList.remove("picked"));
        btn.classList.add("picked");
        q.dataset.pick = btn.dataset.i;
        root.classList.remove("checked");
        grade.textContent = "Grade this module";
        q.querySelector(".why").hidden = true;
      });
    });
  });
  grade.addEventListener("click", () => {
    let correct = 0;
    questions.forEach((q) => {
      const pick = Number(q.dataset.pick);
      const answer = Number(q.dataset.answer);
      q.querySelectorAll("button").forEach((b) => b.classList.remove("good", "bad"));
      const chosen = q.querySelector('button[data-i="' + q.dataset.pick + '"]');
      if (pick === answer) {
        correct += 1;
        if (chosen) chosen.classList.add("good");
      } else if (chosen) chosen.classList.add("bad");
      if (q.dataset.pick !== undefined) q.querySelector(".why").hidden = false;
    });
    root.classList.add("checked");
    grade.textContent = correct + " of " + questions.length;
    const all = readProgress();
    all[slug] = { correct, total: questions.length, passed: correct === questions.length };
    localStorage.setItem(KEY, JSON.stringify(all));
  });
});

const bench = document.getElementById("bench");
if (bench) {
  const method = document.getElementById("method");
  const path = document.getElementById("path");
  const headers = document.getElementById("headers");
  const body = document.getElementById("body");
  const raw = document.getElementById("raw");
  const notes = document.getElementById("notes");
  const render = () => {
    const rows = [...headers.querySelectorAll(".hrow")].map((row) => {
      const [name, value] = row.querySelectorAll("input");
      return { name: name.value.trim(), value: value.value };
    }).filter((r) => r.name);
    const names = rows.map((r) => r.name.toLowerCase());
    const lines = [method.value + " " + (path.value || "/") + " HTTP/1.1"];
    rows.forEach((r) => lines.push(r.name + ": " + r.value));
    const bytes = new TextEncoder().encode(body.value);
    if (body.value && !names.includes("content-length")) lines.push("Content-Length: " + bytes.length);
    raw.textContent = lines.join("\r\n") + "\r\n\r\n" + body.value;
    const found = [];
    if (!names.includes("host")) found.push("No Host header. On HTTP/1.1 a shared IP does not know which site you mean.");
    if (names.includes("transfer-encoding") && names.includes("content-length")) found.push("Both Transfer-Encoding and Content-Length are set. Two parsers may disagree about where the body ends.");
    if (names.includes("x-http-method-override")) found.push("Method override is present. A filter that only saw the start line may have allowed a different verb than the app will run.");
    if (method.value === "GET" && body.value.trim()) found.push("GET with a body. Caches and servers are allowed to ignore it. If the app does not, that is a smell.");
    notes.innerHTML = "";
    (found.length ? found : ["Nothing unusual in this message. Change one header and look again."]).forEach((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      notes.appendChild(li);
    });
  };
  document.getElementById("add-header").addEventListener("click", () => {
    const row = document.createElement("div");
    row.className = "hrow";
    row.innerHTML = '<input aria-label="Header name"><input aria-label="Header value">';
    headers.appendChild(row);
    row.querySelectorAll("input").forEach((input) => input.addEventListener("input", render));
  });
  bench.addEventListener("input", render);
  method.addEventListener("change", render);
  render();
}

function mountList(id, rows, renderItem) {
  const root = document.getElementById(id);
  const filter = document.getElementById("filter");
  if (!root || !window.HFN) return;
  const draw = () => {
    const q = (filter.value || "").trim().toLowerCase();
    root.innerHTML = "";
    rows.filter((row) => !q || renderItem.match(row, q)).forEach((row) => root.appendChild(renderItem.node(row)));
  };
  filter.addEventListener("input", draw);
  draw();
}
mountList("header-list", (window.HFN && window.HFN.headers) || [], {
  match: (h, q) => (h.name + " " + h.role + " " + h.watch).toLowerCase().includes(q),
  node: (h) => {
    const li = document.createElement("li");
    li.className = "card static";
    li.innerHTML = "<p class='idx'>" + h.name + "</p><p>" + h.role + "</p><p class='mute'>" + h.watch + "</p>";
    return li;
  },
});
mountList("status-list", (window.HFN && window.HFN.statuses) || [], {
  match: (s, q) => s.code.startsWith(q) || s.meaning.toLowerCase().includes(q) || s.hunter.toLowerCase().includes(q),
  node: (s) => {
    const li = document.createElement("li");
    li.className = "card static";
    li.innerHTML = "<p class='idx big'>" + s.code + "</p><p>" + s.meaning + "</p><p class='mute'>" + s.hunter + "</p>";
    return li;
  },
});
