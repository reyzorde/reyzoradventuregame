
import type { DialogueLine } from "../types";

export const D: Record<string, DialogueLine[]> = {
  mira_intro: [
    { speaker: "Mira", text: "Demak, sen bobongning bog'ini qayta tiklamoqchisan?" },
    { speaker: "Mira", text: "Avval yerlarni tozalab ol. Keyin urug' ekishni boshlaysan." },
    { speaker: "Mira", text: "Quduqdan suv olishni unutma. Tom do'konida urug' sotadi." },
  ],
  mira_idle: [{ speaker: "Mira", text: "Sabr qil — yaxshi hosil shoshilmaydi. Yerlarni sug'orib tur." }],
  mira_want: [{ speaker: "Mira", text: "Qishloqqa yordam kerak. Menga 2 ta yangi sabzi keltira olasanmi?" }],
  mira_receive: [
    { speaker: "Mira", text: "Rahmat! Kichik bog'ingni kengaytirib qo'ydim." },
    { speaker: "Mira", text: "Endi sharqdagi o'rmon darvozasi ochiq. Qo'ziqorinlar bor — ehtiyot bo'l." },
  ],
  mira_after: [{ speaker: "Mira", text: "Bog'ing yashnayapti. O'rmonda ehtiyot bo'l — yo'l chigal." }],
  mira_forest: [
    { speaker: "Mira", text: "O'rmonga kirdingmi? Qo'ziqorinlar ildiz yonida o'sadi." },
    { speaker: "Mira", text: "Uchta yig'ib kelsang, qishloqqa foyda bo'ladi." },
  ],
  tom: [{ speaker: "Tom", text: "Xush kelibsiz! Urug' kerakmi, yoki hosilni sotmoqchimisiz?" }],
  house: [{ speaker: "Uy", text: "Boboning uyi. Chang bosgan, lekin hali ham iliqlik saqlanadi." }],
  barn: [{ speaker: "Omolxona", text: "Eski omolxona. Keyinchalik hayvonlar uchun joy bo'ladi." }],
  gate_locked: [{ speaker: "", text: "Bu yo'l hozircha yopiq. Avval Mira'ga yordam bering." }],
  gate_open: [{ speaker: "", text: "Darvoza ochiq. O'rmon yo'li oldinda." }],
  forest_sign: [{ speaker: "", text: "«O'rmon — ehtiyot bo'ling. Qo'ziqorinlar ildiz yonida.»" }],
};
