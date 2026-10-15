import { COW_BACK_B64 } from "./cowBack";
import { COW_FRONT_B64 } from "./cowFront";
import { COW_LEFT_B64 } from "./cowLeft";
import { COW_RIGHT_B64 } from "./cowRight";

export const COW_SPRITE_B64: Record<string, string> = {
  ...COW_BACK_B64,
  ...COW_FRONT_B64,
  ...COW_LEFT_B64,
  ...COW_RIGHT_B64,
};
