import "./style.css";
import { createGame } from "./game/createGame";
import { mountHud } from "./hud";
import { unlockAudio } from "./game/systems/AudioSystem";

const root = document.getElementById("game-root");
const hud = document.getElementById("hud");
if (!root || !hud) throw new Error("Missing #game-root or #hud");

document.addEventListener("pointerdown", () => unlockAudio(), { once: true });

const handle = createGame(root);
const unsub = mountHud(hud, handle.model);

window.addEventListener("beforeunload", () => {
  unsub();
  handle.destroy();
});
