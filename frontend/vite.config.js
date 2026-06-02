import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5600,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        login: './login.html',
        dbView: './db-view.html',
        consultas: './consultas.html',
        paciente: './paciente.html',
        secretaria: './secretaria.html'
      }
    }
  }
})
