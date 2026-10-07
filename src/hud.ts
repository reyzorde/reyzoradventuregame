import { CROP_CONFIGS, CROP_LIST, ITEM_DESC, ITEM_LABELS, SELL_PRICE } from "./game/config";
import { MAP_COLS, MAP_ROWS, WORLD_H, WORLD_W } from "./game/config";
import { MAP_LANDMARKS } from "./game/data/map";
import type { GameModel } from "./game/systems/GameModel";
import { sfx, unlockAudio } from "./game/systems/AudioSystem";
import type { CropId, HudSnapshot, ItemId } from "./game/types";

export function mountHud(el: HTMLElement, model: GameModel): () => void {
  const render = () => {
    const h = model.snapshot();
    if (h.menu === "main") el.innerHTML = menuHtml(h);
    else if (h.menu === "confirm_new") el.innerHTML = confirmNewHtml();
    else el.innerHTML = playHtml(h);
    bind(el, model, h);
  };
  const unsub = model.sub(render);
  render();
  return unsub;
}

function menuHtml(h: HudSnapshot): string {
  const actions = h.hasSave
    ? `<button class="btn-p" data-act="continue">Davom etish</button>
        <button class="btn-s" data-act="new">Yangi o'yin</button>`
    : `<button class="btn-p" data-act="new">Yangi o'yin</button>`;
  return `<div class="menu-overlay hit" style="background-image:url('/art/cover.jpg')">
    <div class="panel menu-card">
      <p class="eyebrow">Level 1</p>
      <h1>Reyzor Adventure</h1>
      <p class="subtitle">Yangi Bog'</p>
      <p class="blurb">Bobongizdan meros qolgan kichik bog' sizni kutmoqda.</p>
      <div class="menu-actions">${actions}</div>
      <p class="hint">WASD — yurish · E — ta'sir · I — sumka · M — xarita · 1–3 urug'</p>
    </div>
  </div>`;
}

function confirmNewHtml(): string {
  return `<div class="menu-overlay hit" style="background-image:url('/art/cover.jpg')">
    <div class="panel menu-card">
      <p class="eyebrow">Diqqat</p>
      <h1>Yangi o'yin?</h1>
      <p class="blurb">Eski o'yin o'chiriladi. Davom etasizmi?</p>
      <div class="menu-actions">
        <button class="btn-p" data-act="confirm-new">Ha, yangi o'yin</button>
        <button class="btn-s" data-act="cancel-new">Bekor qilish</button>
      </div>
    </div>
  </div>`;
}

function portraitEmoji(speaker: string): string {
  const s = speaker.toLowerCase();
  if (s.includes("mira")) return "👩";
  if (s.includes("tom")) return "👨";
  if (s.includes("reyzor") || s.includes("siz")) return "🧑‍🌾";
  return "💬";
}

function playHtml(h: HudSnapshot): string {
  const pct = h.questTarget ? Math.min(100, (h.questProgress / h.questTarget) * 100) : 100;
  const slots = CROP_LIST.map((c, i) => {
    const cfg = CROP_CONFIGS[c];
    const n = h.inventory[cfg.seedItem] ?? 0;
    const on = h.selectedSeed === c ? "on" : "";
    const ic = c === "carrot" ? "🥕" : c === "tomato" ? "🍅" : "🍓";
    return `<button class="slot ${on}" data-seed="${c}" title="${cfg.nameUz} (${n})">
      <span class="slot-key">${i + 1}</span>
      <span class="ic">${ic}</span>
      <span class="slot-count">${n}</span>
    </button>`;
  }).join("");

  const notes = h.notices.map((n) => `<div class="panel note">${n.text}</div>`).join("");

  const dlg = h.dialogue
    ? `<div class="dlg-wrap hit">
        <div class="panel dlg-card">
          <div class="dlg-head">
            <div class="dlg-av">${portraitEmoji(h.dialogue.speaker)}</div>
            <div class="dlg-meta">
              <p class="dlg-name">${h.dialogue.speaker || "???"}</p>
              <p class="dlg-role">Suhbat</p>
            </div>
          </div>
          <p class="dlg-text" id="dlg-text">${h.dialogue.text}</p>
          <button class="dlg-next" data-act="dlg">Davom etish →</button>
        </div>
      </div>`
    : "";

  const shop = h.shopOpen ? shopHtml(h) : "";
  const inv = h.inventoryOpen ? invHtml(h) : "";
  const map = h.mapOpen ? mapHtml(h) : "";

  const questBody = h.questCollapsed
    ? ""
    : `<h3>${h.questTitle}</h3>
      <p>${h.questObjective}</p>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="meta"><span>${h.questProgress}/${h.questTarget}</span>${h.questReward ? `<span>${h.questReward}</span>` : ""}</div>`;

  return `
    <div class="top">
      <div class="res-group no-pointer">
        <div class="res-pill" title="Tangalar"><span class="res-ic">🪙</span><span>${h.coins}</span></div>
        <div class="res-pill" title="Suv"><span class="res-ic">💧</span><span>${h.water}/${h.waterMax}</span></div>
      </div>
      <div class="tool-group hit">
        <button class="tool-btn" data-act="map" title="Xarita (M)">🗺</button>
        <button class="tool-btn" data-act="inv" title="Sumka (I)">🎒</button>
      </div>
    </div>
    <div class="panel quest ${h.questCollapsed ? "collapsed" : ""} no-pointer">
      <div class="quest-head hit" data-act="toggle-quest">
        <div class="lab">Topshiriq</div>
        <button class="qmin" type="button">${h.questCollapsed ? "▾" : "▴"}</button>
      </div>
      ${questBody}
    </div>
    ${h.tutorial ? `<div class="panel tut no-pointer">${h.tutorial}</div>` : ""}
    ${h.interactHint ? `<div class="ih no-pointer">${h.interactHint}</div>` : ""}
    <div class="hotbar hit" title="Urug' tanlash — 1 / 2 / 3">${slots}</div>
    <div class="notes no-pointer">${notes}</div>
    ${dlg}${shop}${inv}${map}
    <div class="mob hit">
      <div class="stick" id="stick"><div class="knob" id="knob"></div></div>
      <button class="be" data-act="e">E</button>
    </div>`;
}

function invHtml(h: HudSnapshot): string {
  const entries = (Object.entries(h.inventory) as [ItemId, number][]).filter(([, n]) => n > 0);
  const items = entries.length
    ? entries.map(([id, n]) => {
        const sell = SELL_PRICE[id];
        const desc = ITEM_DESC[id] ?? "";
        return `<div class="iitem">
          <div class="ihead"><b>${ITEM_LABELS[id]}</b><span>×${n}</span></div>
          ${desc ? `<p class="idesc">${desc}</p>` : ""}
          ${sell ? `<button class="s" data-sell-item="${id}">Sotish (${sell}🪙)</button>` : ""}
        </div>`;
      }).join("")
    : `<p class="empty">Sumka bo'sh</p>`;
  return `<div class="modal hit"><div class="panel mcard wide">
    <div class="mh"><div><p class="eyebrow">Sumka</p><h2>Inventar</h2></div>
    <button class="xbtn" data-act="inv">✕</button></div>
    <div class="igrid">${items}</div>
    <div class="vol-row">
      <label>Musiqa <input type="range" min="0" max="100" value="${Math.round(h.musicVol * 100)}" data-vol="music" /></label>
      <label>Effekt <input type="range" min="0" max="100" value="${Math.round(h.sfxVol * 100)}" data-vol="sfx" /></label>
    </div>
  </div></div>`;
}

function mapHtml(h: HudSnapshot): string {
  const px = (h.playerX / WORLD_W) * 100;
  const py = (h.playerY / WORLD_H) * 100;
  const icon: Record<string, string> = {
    house: "🏠", farm: "🌿", barn: "🏚️", well: "🪣",
    shop: "🏪", gate: "🚪", water: "💧", pasture: "🐄",
  };
  const marks = MAP_LANDMARKS.map((m) => {
    const x = ((m.tx + 0.5) / MAP_COLS) * 100;
    const y = ((m.ty + 0.5) / MAP_ROWS) * 100;
    const ic = icon[m.id] ?? "•";
    return `<span class="ml" style="left:${x}%;top:${y}%" title="${m.label}"><i>${ic}</i><em>${m.label}</em></span>`;
  }).join("");
  return `<div class="modal hit"><div class="panel mcard wide map-card">
    <div class="mh"><div><p class="eyebrow">Jahon</p><h2>Xarita</h2></div>
    <button class="xbtn" data-act="map">✕</button></div>
    <div class="minimap">
      <div class="mmap-bg"></div>
      ${marks}
      <span class="mplayer" style="left:${px}%;top:${py}%" title="Siz"></span>
    </div>
    <ul class="map-legend">
      <li><span class="mplayer-dot"></span> Siz</li>
      ${MAP_LANDMARKS.map((m) => `<li>${icon[m.id] ?? "•"} ${m.label}</li>`).join("")}
    </ul>
  </div></div>`;
}

function shopHtml(h: HudSnapshot): string {
  const rows = CROP_LIST.map((c) => {
    const cfg = CROP_CONFIGS[c];
    return `<div class="srow"><div><div class="n">${cfg.nameUz}</div><div class="m">Urug' ${cfg.seedCost} · Hosil ${cfg.harvestPrice}</div></div>
      <div class="sact"><button class="b" data-buy="${c}">Sotib olish</button>
      <button class="s" data-sell="${c}">Sotish ×${h.inventory[cfg.harvestItem] ?? 0}</button></div></div>`;
  }).join("");
  return `<div class="modal hit"><div class="panel mcard"><div class="mh"><div><p class="eyebrow">Tomning do'koni</p><h2>Bozor</h2><p class="hint">Tangalar: ${h.coins}</p></div>
    <button class="xbtn" data-act="close-shop">✕</button></div>${rows}</div></div>`;
}

function bind(el: HTMLElement, model: GameModel, h: HudSnapshot): void {
  const on = (sel: string, fn: () => void) => {
    el.querySelectorAll(sel).forEach((n) => n.addEventListener("click", (e) => { e.stopPropagation(); fn(); }));
  };
  on('[data-act="new"]', () => { unlockAudio(); sfx("ui"); model.requestNewGame(); });
  on('[data-act="continue"]', () => { unlockAudio(); sfx("ui"); model.continueGame(); });
  on('[data-act="confirm-new"]', () => { unlockAudio(); sfx("ui"); model.confirmNewGame(); });
  on('[data-act="cancel-new"]', () => { unlockAudio(); sfx("ui"); model.cancelNewGame(); });
  on('[data-act="dlg"]', () => model.advanceDialogue());
  on('[data-act="inv"]', () => model.toggleInventory());
  on('[data-act="map"]', () => model.toggleMap());
  on('[data-act="toggle-quest"]', () => model.toggleQuestPanel());
  on('[data-act="close-shop"]', () => model.closeShop());
  on('[data-act="e"]', () => { model.interactQueued = true; });
  el.querySelectorAll<HTMLElement>("[data-seed]").forEach((b) => {
    b.addEventListener("click", () => model.selectSeed(b.dataset.seed as CropId));
  });
  el.querySelectorAll<HTMLElement>("[data-buy]").forEach((b) => {
    b.addEventListener("click", () => model.buySeed(b.dataset.buy as CropId));
  });
  el.querySelectorAll<HTMLElement>("[data-sell]").forEach((b) => {
    b.addEventListener("click", () => model.sellCrop(b.dataset.sell as CropId));
  });
  el.querySelectorAll<HTMLElement>("[data-sell-item]").forEach((b) => {
    b.addEventListener("click", () => model.sellItem(b.dataset.sellItem as ItemId));
  });
  el.querySelectorAll<HTMLInputElement>("[data-vol]").forEach((inp) => {
    inp.addEventListener("input", () => {
      const music = Number((el.querySelector('[data-vol="music"]') as HTMLInputElement)?.value ?? 35) / 100;
      const sfxV = Number((el.querySelector('[data-vol="sfx"]') as HTMLInputElement)?.value ?? 70) / 100;
      model.setVolumes(music, sfxV);
    });
  });

  const dlgText = el.querySelector("#dlg-text");
  if (dlgText && h.dialogue) {
    const full = h.dialogue.text;
    dlgText.textContent = "";
    let i = 0;
    const tick = () => {
      if (i <= full.length) {
        dlgText.textContent = full.slice(0, i);
        i++;
        window.setTimeout(tick, 16);
      }
    };
    tick();
  }

  const stick = el.querySelector<HTMLElement>("#stick");
  const knob = el.querySelector<HTMLElement>("#knob");
  if (stick && knob) {
    let origin: { x: number; y: number } | null = null;
    const move = (cx: number, cy: number) => {
      if (!origin) return;
      let dx = (cx - origin.x) / 46;
      let dy = (cy - origin.y) / 46;
      const len = Math.hypot(dx, dy);
      const s = len > 1 ? 1 / len : 1;
      dx *= s; dy *= s;
      model.joystick = { x: dx, y: dy };
      knob.style.transform = `translate(calc(-50% + ${dx * 28}px), calc(-50% + ${dy * 28}px))`;
    };
    const end = () => {
      origin = null;
      model.joystick = { x: 0, y: 0 };
      knob.style.transform = "translate(-50%, -50%)";
    };
    stick.addEventListener("pointerdown", (e) => {
      origin = { x: e.clientX, y: e.clientY };
      stick.setPointerCapture(e.pointerId);
    });
    stick.addEventListener("pointermove", (e) => move(e.clientX, e.clientY));
    stick.addEventListener("pointerup", end);
    stick.addEventListener("pointercancel", end);
  }
}
