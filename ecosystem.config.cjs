/* eslint-env node */
// PM2 ecosystem config for SkyTravel
// Start:   pm2 start ecosystem.config.cjs --env production
// Restart: pm2 restart ecosystem.config.cjs --env production

module.exports = {
  apps: [
    {
      name: "skytravel-api",
      cwd: "./server",
      script: "npm",
      args: "start",
      exec_mode: "fork",
      node_args: "--max-old-space-size=450",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: "512M",
      wait_ready: true,
      listen_timeout: 8000,
      kill_timeout: 5000,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/api-error.log",
      out_file: "./logs/api-out.log",
      merge_logs: true,
    },
    {
      name: "skytravel-ui",
      cwd: "./client",
      script: "npm",
      args: "start",
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 4173,
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: "256M",
    },
  ],
};
