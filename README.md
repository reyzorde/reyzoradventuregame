# Reyzor Adventure

Cozy 2D adventure + farming game. **Level 1 — Yangi Bog'** and **Level 2 — O'rmon** are playable.

## Story

You leave the city for a small garden inherited from your grandfather. Clear weeds, plant crops, water them at the well, harvest, help Mira, unlock the forest gate, gather mushrooms, and expand your life in the village.

## Tech

- Phaser 3.90
- TypeScript (strict)
- Vite

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Move | WASD / arrows | Virtual stick |
| Interact | E / Space | E button |
| Seeds | 1 / 2 / 3 | Hotbar |
| Inventory | I | Backpack |

Diagonal movement is normalized. Collision blocks buildings, trees, water, and map edges.

## Features

### Level 1 — Yangi Bog'
- Explore house, garden, village road, well, barn, river, forest gate
- Farming: till → plant → water → grow → harvest
- Crops: sabzi, pomidor, qulupnay
- Inventory, coins, Tom's shop
- Mira dialogue + 5-quest chain
- Small Garden Upgrade (3 extra plots)
- Day/time HUD
- Versioned localStorage save

### Level 2 — O'rmon
- Forest gate unlocks after helping Mira
- Dense forest zone east of the gate
- Forage mushrooms (5 spawn locations)
- New quests: enter forest → gather 3 mushrooms
- Rewards: coins + wood
- Forest sign and denser trees

Growth times are short (~14–22s) for a 10–25 minute first session covering both levels.

## Quest flow

1. Clear 5 weeds
2. Plant 3 crops
3. Water 3 crops
4. Harvest 3 crops
5. Give Mira 2 carrots → garden upgrade + forest unlock
6. Open the eastern gate
7. Gather 3 mushrooms

## Next ideas

- Animals / fishing / crafting
- Weather / seasons
- More NPCs / relationship system
- Lake & Mountain levels
