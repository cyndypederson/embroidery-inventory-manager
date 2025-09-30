module.exports = {
  apps: [{
    name: 'embroidery-inventory',
    script: 'server.js',
    cwd: '/Users/cyndyp/Desktop/Projects/Embroidery',
    instances: 1,
    exec_mode: 'fork', // Changed from cluster to fork to avoid port conflicts
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
