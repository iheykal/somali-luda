# Audio Setup Guide

✅ **Audio effects have been integrated and audio files have been copied!**

## Audio Files Status

All audio files from the Ludo-mg repository have been successfully copied to `public/audio/`:

- ✅ `sfx_dice_roll.mp3` - Dice rolling sound
- ✅ `sfx_token_killed.mp3` - Pawn capture/kill sound
- ✅ `sfx_token_move.mp3` - Pawn movement sound
- ✅ `sfx_win.mp3` - Victory/win sound
- ✅ `sfx_in_home.mp3` - Token entering home sound
- ✅ `sfx_click.mp3` - UI click sound (available for future use)
- ✅ `sfx_my_turn.mp3` - My turn notification (available for future use)
- ✅ `sfx_opp_turn.mp3` - Opponent turn notification (available for future use)
- ✅ `sfx_clock.mp3` - Timer/clock sound (available for future use)

### Option 2: Use Free Sound Effects

If you can't find the files from Ludo-mg, download free sound effects:

1. **Visit a free sound effects site:**
   - [Freesound](https://freesound.org/) - Search for "dice roll", "game kill", "victory"
   - [Zapsplat](https://www.zapsplat.com/) - Free game sound effects
   - [Mixkit](https://mixkit.co/free-sound-effects/) - Free sound effects

2. **Download and rename files:**
   - `dice-roll.mp3` - Dice rolling sound
   - `kill.mp3` - Pawn capture/kill sound
   - `move.mp3` - Pawn movement sound (optional)
   - `win.mp3` - Victory/win sound

3. **Place files in:** `public/audio/`

## Integrated Sounds

The following sounds are actively used in the game:

- ✅ `sfx_dice_roll.mp3` - Plays when dice is rolled
- ✅ `sfx_token_killed.mp3` - Plays when a pawn captures another
- ✅ `sfx_token_move.mp3` - Plays when a pawn moves
- ✅ `sfx_in_home.mp3` - Plays when a token enters home
- ✅ `sfx_win.mp3` - Plays when a player wins

## Testing

1. Start your dev server: `npm run dev`
2. Play the game
3. Verify sounds play for:
   - 🎲 Rolling the dice
   - ⚔️ Capturing a pawn
   - 🏆 Winning the game

## Troubleshooting

### No sound playing?

1. **Check browser console** for errors
2. **User interaction required**: Modern browsers block autoplay. Click/tap the page first, then play
3. **Check file paths**: Ensure files are in `public/audio/` and named correctly
4. **Check file format**: MP3 is recommended. If using WAV/OGG, update `services/audioService.ts`

### Audio files not found?

The game will still work without audio files. You'll see console warnings, but gameplay won't be affected.

## Audio Service

The audio system is implemented in `services/audioService.ts`. You can:
- Toggle audio on/off: `audioService.setEnabled(false)`
- Adjust volume: `audioService.setVolume(0.5)` (0.0 to 1.0)

## Current Implementation

Audio is integrated in:
- ✅ `components/Dice.tsx` - Dice roll sound
- ✅ `hooks/useGameLogic.ts` - Kill, move, and win sounds

All audio calls are non-blocking and won't crash the game if files are missing.

