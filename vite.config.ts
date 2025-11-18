import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

// Helper function to load .env file from server directory
function loadServerEnv() {
    try {
        const serverEnvPath = path.resolve(__dirname, 'server', '.env');
        const envContent = readFileSync(serverEnvPath, 'utf-8');
        const env: Record<string, string> = {};
        
        envContent.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').replace(/^["']|["']$/g, '');
                    env[key.trim()] = value.trim();
                }
            }
        });
        
        return env;
    } catch (error) {
        console.warn('Could not load server/.env file:', error);
        return {};
    }
}

export default defineConfig(({ mode }) => {
    // Load environment variables from server/.env (for local development)
    const serverEnv = loadServerEnv();
    
    // Also load from root as fallback (for VITE_ prefixed vars)
    const rootEnv = loadEnv(mode, '.', '');
    
    // Get environment variables from process.env (for production builds on Render/CI)
    // These take highest priority as they come from the deployment environment
    const processEnv: Record<string, string> = {};
    const envKeys = [
        'VITE_API_URL', 'API_URL',
        'VITE_BACKEND_URL', 'BACKEND_URL',
        'VITE_SOCKET_URL', 'SOCKET_URL',
        'VITE_USE_REAL_API', 'USE_REAL_API',
        'GEMINI_API_KEY'
    ];
    envKeys.forEach(key => {
        if (process.env[key]) {
            processEnv[key] = process.env[key];
        }
    });
    
    // Merge: process env (production) takes highest precedence, then server env (local dev), then root env
    const mergedEnv = { ...rootEnv, ...serverEnv, ...processEnv };
    
    // Define constants with production defaults as fallback
    // This ensures that even if Render doesn't pass env vars during build, we use correct production values
    const VITE_API_URL = mergedEnv.VITE_API_URL || mergedEnv.API_URL || (mode === 'production' ? '/api' : undefined);
    const VITE_SOCKET_URL = mergedEnv.VITE_SOCKET_URL || mergedEnv.SOCKET_URL || (mode === 'production' ? 'https://ludo-252.onrender.com' : undefined);
    const VITE_USE_REAL_API = mergedEnv.VITE_USE_REAL_API || mergedEnv.USE_REAL_API || (mode === 'production' ? 'true' : 'false');
    const GEMINI_API_KEY = mergedEnv.GEMINI_API_KEY;
    
    // ALWAYS log environment variable sources for debugging (not just in production)
    console.log('========================================');
    console.log('🔧 Vite Build Environment Variables');
    console.log('========================================');
    console.log('Mode:', mode);
    console.log('VITE_API_URL:', VITE_API_URL);
    console.log('VITE_SOCKET_URL:', VITE_SOCKET_URL);
    console.log('VITE_USE_REAL_API:', VITE_USE_REAL_API);
    console.log('Process Env Keys:', Object.keys(processEnv).length > 0 ? Object.keys(processEnv) : 'none');
    console.log('Server Env:', Object.keys(serverEnv).length > 0 ? 'loaded from server/.env' : 'not found');
    console.log('========================================');
    
    return {
      root: '.',
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Ensure proper MIME types for audio files
        fs: {
          strict: false,
        },
      },
      plugins: [react()],
      // Configure public directory
      publicDir: 'public',
      define: {
        'process.env.API_KEY': JSON.stringify(GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(GEMINI_API_KEY),
        // Expose environment variables to the app with production defaults
        // These constants are defined above with fallbacks to production values
        'import.meta.env.VITE_API_URL': JSON.stringify(VITE_API_URL),
        'import.meta.env.VITE_BACKEND_URL': JSON.stringify(mergedEnv.VITE_BACKEND_URL || mergedEnv.BACKEND_URL),
        'import.meta.env.VITE_SOCKET_URL': JSON.stringify(VITE_SOCKET_URL),
        'import.meta.env.VITE_USE_REAL_API': JSON.stringify(VITE_USE_REAL_API),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        },
        extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']
      }
    };
});
