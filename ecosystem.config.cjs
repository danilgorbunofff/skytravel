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
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: "512M",
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
