// Audio service for game sound effects
class AudioService {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.7;
  private audioUnlocked: boolean = false;

  constructor() {
    // Preload audio files
    this.preloadSounds();
    // Unlock audio on first user interaction
    this.setupAudioUnlock();
  }

  private setupAudioUnlock() {
    // Unlock audio on any user interaction
    const unlockAudio = async () => {
      if (!this.audioUnlocked) {
        try {
          // Try to play a silent sound to unlock audio
          const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
          await silentAudio.play();
          this.audioUnlocked = true;
          console.log('🔊 Audio unlocked');
        } catch (error) {
          // Ignore errors, will try again on next interaction
        }
      }
    };

    // Listen for user interactions
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true });
    });
  }

  private preloadSounds() {
    // Use base URL if available (for Vite), otherwise use root
    const baseUrl = import.meta.env.BASE_URL || '/';
    const audioBase = baseUrl === '/' ? '/audio/' : `${baseUrl}audio/`;
    
    const soundFiles = {
      diceRoll: `${audioBase}sfx_dice_roll.mp3`,
      kill: `${audioBase}sfx_token_killed.mp3`,
      move: `${audioBase}sfx_token_move.mp3`,
      win: `${audioBase}sfx_win.mp3`,
      inHome: `${audioBase}sfx_in_home.mp3`,
      click: `${audioBase}sfx_click.mp3`,
      myTurn: `${audioBase}sfx_my_turn.mp3`,
      oppTurn: `${audioBase}sfx_opp_turn.mp3`,
      clock: `${audioBase}sfx_clock.mp3`,
    };

    console.log('🎵 Loading audio files from base:', audioBase);

    Object.entries(soundFiles).forEach(([key, path]) => {
      try {
        // Create audio element with explicit type
        const audio = new Audio();
        audio.type = 'audio/mpeg';
        audio.src = path;
        audio.volume = this.volume;
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous'; // Allow CORS if needed
        
        // Only log errors once to avoid console spam
        let loadErrorLogged = false;
        audio.addEventListener('error', (e) => {
          if (loadErrorLogged) return;
          loadErrorLogged = true;
          
          const error = audio.error;
          if (error && error.code === 4) {
            // MEDIA_ERR_SRC_NOT_SUPPORTED - format issue
            console.warn(`⚠️ Audio file format issue detected: ${key}`);
            console.warn(`   File: ${path}`);
            console.warn(`   The MP3 file may be corrupted or use an unsupported codec.`);
            console.warn(`   See AUDIO_FIX.md for instructions on re-encoding the files.`);
          }
        });
        
        audio.addEventListener('loadeddata', () => {
          console.log(`✅ Loaded: ${key} from ${path}`);
        });
        
        audio.addEventListener('canplaythrough', () => {
          console.log(`✅ Ready to play: ${key}`);
        });
        
        this.sounds.set(key, audio);
      } catch (error) {
        console.error(`Error creating audio for ${key}:`, error);
      }
    });
  }

  play(soundName: string) {
    if (!this.enabled) {
      return;
    }

    const audio = this.sounds.get(soundName);
    if (!audio) {
      return;
    }

    // Check if audio has a persistent error - if so, don't try to play
    if (audio.error && audio.error.code === 4) {
      // MEDIA_ERR_SRC_NOT_SUPPORTED - file format issue
      // Silently fail to avoid console spam
      return;
    }

    // Try to play directly - simplest approach
    try {
      const audioElement = new Audio(audio.src);
      audioElement.volume = this.volume;
      
      // Only log errors once per sound to avoid spam
      let errorLogged = false;
      audioElement.addEventListener('error', () => {
        if (!errorLogged) {
          errorLogged = true;
          const error = audioElement.error;
          if (error && error.code === 4) {
            // Format error - mark the original audio as having this error
            console.warn(`⚠️ Audio file format issue: ${soundName}. File may need to be re-encoded.`);
            // Mark this sound as having an error so we don't keep trying
            audio.addEventListener('error', () => {}, { once: true });
          }
        }
      });
      
      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          // Silently handle autoplay restrictions
          if (!err.message.includes('play() request was interrupted')) {
            this.audioUnlocked = false;
            this.setupAudioUnlock();
          }
        });
      }
    } catch (error) {
      // Silently fail
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(audio => {
      audio.volume = this.volume;
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getVolume(): number {
    return this.volume;
  }

  // Test function to verify audio is working
  testAudio(soundName: string = 'diceRoll') {
    console.log('🧪 Testing audio:', soundName);
    const audio = this.sounds.get(soundName);
    if (audio) {
      console.log('✅ Audio file found:', audio.src);
      console.log('📊 Audio readyState:', audio.readyState);
      console.log('📊 Audio networkState:', audio.networkState);
      if (audio.error) {
        console.error('❌ Audio error:', {
          code: audio.error.code,
          message: audio.error.message
        });
      }
      // Try to fetch the file to verify it's accessible
      fetch(audio.src)
        .then(response => {
          if (response.ok) {
            console.log('✅ File is accessible via fetch');
          } else {
            console.error('❌ File not accessible:', response.status, response.statusText);
          }
        })
        .catch(err => {
          console.error('❌ Fetch error:', err);
        });
      console.log('🔊 Attempting to play...');
      this.play(soundName);
    } else {
      console.error('❌ Audio file not found:', soundName);
      console.log('Available sounds:', Array.from(this.sounds.keys()));
    }
  }

  // Get all loaded sounds for debugging
  getLoadedSounds(): string[] {
    return Array.from(this.sounds.keys());
  }
}

// Export singleton instance
export const audioService = new AudioService();

// Log audio service initialization
console.log('🎵 Audio service initialized');

