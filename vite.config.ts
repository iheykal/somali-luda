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
    
    // Log environment variable sources for debugging (only in build mode)
    if (mode === 'production') {
        console.log('🔧 Vite Build Environment Variables:');
        console.log('   Process Env:', Object.keys(processEnv).length > 0 ? processEnv : 'none');
        console.log('   Server Env:', Object.keys(serverEnv).length > 0 ? 'loaded from server/.env' : 'not found');
        console.log('   Merged VITE_API_URL:', mergedEnv.VITE_API_URL || mergedEnv.API_URL || 'not set');
        console.log('   Merged VITE_SOCKET_URL:', mergedEnv.VITE_SOCKET_URL || mergedEnv.SOCKET_URL || 'not set');
        console.log('   Merged VITE_USE_REAL_API:', mergedEnv.VITE_USE_REAL_API || mergedEnv.USE_REAL_API || 'false');
    }
    
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
        'process.env.API_KEY': JSON.stringify(mergedEnv.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(mergedEnv.GEMINI_API_KEY),
        // Expose environment variables to the app
        // Support both VITE_ prefixed and non-prefixed vars from server/.env
        'import.meta.env.VITE_API_URL': JSON.stringify(mergedEnv.VITE_API_URL || mergedEnv.API_URL),
        'import.meta.env.VITE_BACKEND_URL': JSON.stringify(mergedEnv.VITE_BACKEND_URL || mergedEnv.BACKEND_URL),
        'import.meta.env.VITE_SOCKET_URL': JSON.stringify(mergedEnv.VITE_SOCKET_URL || mergedEnv.SOCKET_URL),
        'import.meta.env.VITE_USE_REAL_API': JSON.stringify(mergedEnv.VITE_USE_REAL_API || mergedEnv.USE_REAL_API || 'false'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        },
        extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']
      }
    };
});
