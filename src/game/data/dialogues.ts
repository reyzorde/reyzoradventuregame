
import type { DialogueLine } from "../types";

export const D: Record<string, DialogueLine[]> = {
  mira_intro: [
    { speaker: "Mira", text: "Salom! Bobongning bog'ini qayta tiklamoqchimisan?" },
    { speaker: "Mira", text: "Avval begona o'tlarni yuling. Keyin yerni haydab, urug' eking." },
    { speaker: "Mira", text: "Quduqdan suv oling — sug'ormasangiz ekin o'smaydi. Tom urug' sotadi." },
  ],
  mira_idle: [{ speaker: "Mira", text: "Sabr qiling — yaxshi hosil shoshilmaydi. Yerlarni vaqtida sug'oring." }],
  mira_want: [{ speaker: "Mira", text: "Qishloqqa yordam kerak. Menga 2 ta yangi sabzi keltira olasizmi?" }],
  mira_receive: [
    { speaker: "Mira", text: "Rahmat! Kichik bog'ingizni kengaytirib qo'ydim." },
    { speaker: "Mira", text: "Endi sharqdagi o'rmon darvozasi ochiq. Qo'ziqorinlar bor — ehtiyot bo'ling." },
  ],
  mira_after: [{ speaker: "Mira", text: "Bog'ingiz yashnayapti. O'rmonda ehtiyot bo'ling — yo'l chigal." }],
  mira_forest: [
    { speaker: "Mira", text: "O'rmonga kirdingizmi? Qo'ziqorinlar daraxt ildizi yonida o'sadi." },
    { speaker: "Mira", text: "Uchtasini yig'ib kelsangiz, qishloqqa foyda bo'ladi." },
  ],
  tom: [{ speaker: "Tom", text: "Xush kelibsiz! Urug' kerakmi, yoki hosilni sotmoqchimisiz?" }],
  house: [{ speaker: "Uy", text: "Boboning uyi. Chang bosgan, lekin hali ham iliqlik saqlanadi." }],
  barn: [{ speaker: "Molxona", text: "Eski molxona. Keyinchalik hayvonlar uchun joy bo'ladi." }],
  gate_locked: [{ speaker: "", text: "Bu yo'l hozircha yopiq. Avval Miraga yordam bering." }],
  gate_open: [{ speaker: "", text: "Darvoza ochiq. O'rmon yo'li oldinda." }],
  forest_sign: [{ speaker: "", text: "«O'rmon — ehtiyot bo'ling. Qo'ziqorinlar ildiz yonida.»" }],
};
