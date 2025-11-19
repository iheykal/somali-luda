# Audio Files Issue - Fix Guide

## Problem
The audio files from Ludo-mg repository are corrupted or use an unsupported codec. The browser can fetch them (HTTP 200) but cannot decode them, resulting in:
- `FFmpegDemuxer: open context failed`
- `Format error`
- `MEDIA_ERR_SRC_NOT_SUPPORTED`

## Solution: Re-encode the Audio Files

The MP3 files need to be re-encoded to a browser-compatible format. Here are several options:

### Option 1: Use FFmpeg (Recommended)

If you have FFmpeg installed:

```bash
# Navigate to the audio directory
cd public/audio

# Re-encode all MP3 files to browser-compatible MP3
for file in *.mp3; do
  ffmpeg -i "$file" -acodec libmp3lame -ar 44100 -ac 2 -b:a 128k "fixed_${file}"
done

# Replace original files
for file in fixed_*.mp3; do
  mv "$file" "${file#fixed_}"
done
```

### Option 2: Use Online Converter

1. Go to https://cloudconvert.com/mp3-to-mp3 or similar
2. Upload each audio file
3. Set output format to MP3, 128kbps, 44.1kHz
4. Download and replace files in `public/audio/`

### Option 3: Use Audacity (Free Audio Editor)

1. Download Audacity: https://www.audacityteam.org/
2. Open each MP3 file
3. Export as MP3 with these settings:
   - Bit Rate: 128 kbps
   - Sample Rate: 44100 Hz
   - Channels: Stereo
4. Replace original files

### Option 4: Download New Sound Effects

If re-encoding doesn't work, download new sound effects:

1. **Freesound.org** - https://freesound.org/
   - Search for: "dice roll", "game kill", "victory sound"
   - Download as MP3, 128kbps or higher

2. **Zapsplat** - https://www.zapsplat.com/
   - Free game sound effects
   - Requires free account

3. **Mixkit** - https://mixkit.co/free-sound-effects/
   - Free sound effects, no account needed

## Required Files

After fixing, ensure these files exist in `public/audio/`:
- `sfx_dice_roll.mp3`
- `sfx_token_killed.mp3`
- `sfx_token_move.mp3`
- `sfx_win.mp3`
- `sfx_in_home.mp3`
- `sfx_click.mp3` (optional)
- `sfx_my_turn.mp3` (optional)
- `sfx_opp_turn.mp3` (optional)
- `sfx_clock.mp3` (optional)

## Testing

After replacing files:
1. Restart dev server: `npm run dev`
2. Open browser console
3. Test audio: `testAudio("diceRoll")`
4. You should see: `🔊 Playing sound: diceRoll` (no errors)

## Current Status

The audio system is configured to fail gracefully - the game will work without audio, but sounds won't play until the files are fixed.







