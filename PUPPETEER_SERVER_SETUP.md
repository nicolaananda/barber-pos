# Puppeteer Server Setup (Linux/Docker)

## Error
```
Failed to launch the browser process: Code: 127
libatk-1.0.so.0: cannot open shared object file: No such file or directory
```

## Solution: Install Required Dependencies

### For Debian/Ubuntu (including Docker)

Add to your `Dockerfile` or run on server:

```bash
# Install Chrome dependencies
apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils
```

### Quick Install (One-liner)

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
```

---

## Alternative: Update Dockerfile

If using Docker, update your `Dockerfile`:

```dockerfile
FROM node:18-slim

# Install Puppeteer dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libgbm1 \
    libgtk-3-0 \
    libnss3 \
    libxss1 \
    libxtst6 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Rest of your Dockerfile...
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
```

---

## Verify Installation

After installing dependencies, test Puppeteer:

```bash
node -e "const puppeteer = require('puppeteer'); (async () => { const browser = await puppeteer.launch(); console.log('Success!'); await browser.close(); })();"
```

---

## Production Optimization

For production, consider:

1. **Use `--no-sandbox` flag** (already configured in code)
2. **Disable GPU** for headless mode
3. **Set memory limits** if needed

Current configuration in `pdf-generator.js`:
```javascript
browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

This is already optimized for server environments.

---

## Troubleshooting

If still having issues:

1. **Check Puppeteer version**: `npm list puppeteer`
2. **Clear Puppeteer cache**: `rm -rf ~/.cache/puppeteer`
3. **Reinstall Puppeteer**: `npm rebuild puppeteer`
4. **Check Chrome binary**: `ls -la /root/.cache/puppeteer/chrome/`

---

## Alternative Solution: Use Lightweight PDF Library

If you can't install dependencies, consider switching to `pdfkit`:

```bash
npm uninstall puppeteer
npm install pdfkit
```

Then update `pdf-generator.js` to use pdfkit instead (requires code rewrite).
