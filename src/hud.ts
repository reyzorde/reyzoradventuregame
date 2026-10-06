import { CROP_CONFIGS, CROP_LIST, ITEM_LABELS } from "./game/config";
import type { GameModel } from "./game/systems/GameModel";
import { sfx, unlockAudio } from "./game/systems/AudioSystem";
import type { CropId, HudSnapshot, ItemId } from "./game/types";

export function mountHud(el: HTMLElement, model: GameModel): () => void {
  const render = () => {
    const h = model.snapshot();
    el.innerHTML = h.menu === "main" ? menuHtml(h) : playHtml(h);
    bind(el, model, h);
  };
  const unsub = model.sub(render);
  render();
  return unsub;
}

function menuHtml(h: HudSnapshot): string {
  return `<div class="menu-overlay hit">
    <div class="panel menu-card">
      <p class="eyebrow">Level 1–2</p>
      <h1>Reyzor Adventure</h1>
      <p class="subtitle">Yangi Bog' + O'rmon</p>
      <p class="blurb">Shahar shovqinidan charchadingiz. Bobongizdan meros qolgan kichik bog' va uning orqasidagi o'rmon sizni kutmoqda.</p>
      <div class="menu-actions">
        <button class="btn-p" data-act="new">Yangi o'yin</button>
        <button class="btn-s" data-act="continue" ${h.hasSave ? "" : "disabled"}>Davom etish</button>
      </div>
      <p class="hint">WASD / strelkalar — yurish · E — o'zaro ta'sir · 1–3 urug' · I inventar</p>
    </div>
  </div>`;
}

function playHtml(h: HudSnapshot): string {
  const pct = h.questTarget ? Math.min(100, (h.questProgress / h.questTarget) * 100) : 100;
  const slots = CROP_LIST.map((c, i) => {
    const cfg = CROP_CONFIGS[c];
    const n = h.inventory[cfg.seedItem] ?? 0;
    const on = h.selectedSeed === c ? "on" : "";
    const ic = c === "carrot" ? "🥕" : c === "tomato" ? "🍅" : "🍓";
    return `<button class="slot ${on}" data-seed="${c}"><span class="ic">${ic}</span><span>${i + 1}</span><span>${n}</span></button>`;
  }).join("");
  const notes = h.notices.map((n) => `<div class="panel note">${n.text}</div>`).join("");
  const dlg = h.dialogue
    ? `<button class="panel dlg hit" data-act="dlg">${h.dialogue.speaker ? `<p class="sp">${h.dialogue.speaker}</p>` : ""}<p class="tx">${h.dialogue.text}</p><p class="ct">Davom etish uchun bosing / E</p></button>`
    : "";
  const shop = h.shopOpen ? shopHtml(h) : "";
  const inv = h.inventoryOpen ? invHtml(h) : "";
  return `
    <div class="top">
      <div class="panel pill no-pointer">Bog'bon · Reyzor</div>
      <div style="display:flex;gap:8px">
        <div class="panel pill no-pointer">🪙 ${h.coins}</div>
        <div class="panel pill no-pointer">💧 ${h.water}/${h.waterMax}</div>
        <div class="panel pill no-pointer">Kun ${h.day} · ${h.clock}</div>
      </div>
    </div>
    <div class="panel quest no-pointer">
      <div class="lab">Topshiriq</div>
      <h3>${h.questTitle}</h3>
      <p>${h.questObjective}</p>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="meta"><span>${h.questProgress}/${h.questTarget}</span>${h.questReward ? `<span>Mukofot: ${h.questReward}</span>` : ""}</div>
    </div>
    ${h.tutorial ? `<div class="panel tut no-pointer">${h.tutorial}</div>` : ""}
    ${h.interactHint ? `<div class="ih no-pointer">${h.interactHint}</div>` : ""}
    <div class="hot hit">${slots}
      <div class="slot no-pointer"><span class="ic">💧</span><span>${h.water}/${h.waterMax}</span></div>
      <button class="slot" data-act="inv"><span class="ic">🎒</span><span>I</span></button>
    </div>
    <div class="notes no-pointer">${notes}</div>
    ${dlg}${shop}${inv}
    <div class="mob hit">
      <div class="stick" id="stick"><div class="knob" id="knob"></div></div>
      <button class="be" data-act="e">E</button>
    </div>`;
}

function shopHtml(h: HudSnapshot): string {
  const rows = CROP_LIST.map((c) => {
    const cfg = CROP_CONFIGS[c];
    return `<div class="srow"><div><div class="n">${cfg.nameUz}</div><div class="m">Urug' ${cfg.seedCost} · Hosil ${cfg.harvestPrice}</div></div>
      <div class="sact"><button class="b" data-buy="${c}">Sotib olish</button>
      <button class="s" data-sell="${c}">Sotish ×${h.inventory[cfg.harvestItem]}</button></div></div>`;
  }).join("");
  return `<div class="modal hit"><div class="panel mcard"><div class="mh"><div><p class="eyebrow">Tomning do'koni</p><h2>Bozor</h2><p class="hint">Tangalar: ${h.coins}</p></div>
    <button class="xbtn" data-act="close-shop">✕</button></div>${rows}</div></div>`;
}

function invHtml(h: HudSnapshot): string {
  const items = (Object.entries(h.inventory) as [ItemId, number][])
    .map(([id, n]) => `<div class="iitem"><b>${ITEM_LABELS[id]}</b> ×${n}</div>`).join("");
  return `<div class="modal hit"><div class="panel mcard"><div class="mh"><h2>Inventar</h2>
    <button class="xbtn" data-act="inv">✕</button></div><div class="igrid">${items}</div></div></div>`;
}

function bind(el: HTMLElement, model: GameModel, h: HudSnapshot): void {
  el.querySelector('[data-act="new"]')?.addEventListener("click", () => { unlockAudio(); sfx("ui"); model.newGame(); });
  el.querySelector('[data-act="continue"]')?.addEventListener("click", () => { unlockAudio(); sfx("ui"); model.continueGame(); });
  el.querySelector('[data-act="dlg"]')?.addEventListener("click", () => model.advanceDialogue());
  el.querySelector('[data-act="inv"]')?.addEventListener("click", () => model.toggleInventory());
  el.querySelector('[data-act="close-shop"]')?.addEventListener("click", () => model.closeShop());
  el.querySelector('[data-act="e"]')?.addEventListener("click", () => { model.interactQueued = true; });
  el.querySelectorAll<HTMLElement>("[data-seed]").forEach((b) => {
    b.addEventListener("click", () => model.selectSeed(b.dataset.seed as CropId));
  });
  el.querySelectorAll<HTMLElement>("[data-buy]").forEach((b) => {
    b.addEventListener("click", () => model.buySeed(b.dataset.buy as CropId));
  });
  el.querySelectorAll<HTMLElement>("[data-sell]").forEach((b) => {
    b.addEventListener("click", () => model.sellCrop(b.dataset.sell as CropId));
  });
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
  void h;
}
