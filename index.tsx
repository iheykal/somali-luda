
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { audioService } from './services/audioService.ts';

// Make audio service available in console for testing
// @ts-ignore
window.testAudio = (soundName?: string) => {
  audioService.testAudio(soundName);
  console.log('💡 Available sounds:', audioService.getLoadedSounds());
  console.log('💡 Usage: testAudio("diceRoll"), testAudio("kill"), testAudio("move"), etc.');
};

// @ts-ignore
window.audioService = audioService;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
