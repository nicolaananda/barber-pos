module.exports = {
  apps: [
    {
      name: 'staycool-backend',
      cwd: './backend',
      script: 'npm',
      args: 'run server',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        WA_GATEWAY_URL: 'http://localhost:3000'
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      instances: 1,
      exec_mode: 'fork'
    },
    {
      name: 'staycool-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'run preview -- --port 7781 --host',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      instances: 1,
      exec_mode: 'fork'
    }
  ]
};
