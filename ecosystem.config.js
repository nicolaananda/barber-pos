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
        WA_GATEWAY_URL: 'https://gowa.nicola.id',
        WA_DEVICE_ID: 'bagus_tab',
        WA_GATEWAY_USER: process.env.WA_GATEWAY_USER || '',
        WA_GATEWAY_PASS: process.env.WA_GATEWAY_PASS || '',
        WA_WEBHOOK_SECRET: process.env.WA_WEBHOOK_SECRET || ''
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
