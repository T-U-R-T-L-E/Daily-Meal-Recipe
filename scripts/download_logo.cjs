const fs = require('fs');
const path = require('path');
const https = require('https');

const logoUrl = 'https://kicksplug.shop/wp-content/uploads/2026/05/logo.png';
const targetDir = path.join(__dirname, '..', 'public');
const targetPath = path.join(targetDir, 'logo.png');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

console.log('Downloading logo from:', logoUrl);
console.log('Saving to:', targetPath);

const file = fs.createWriteStream(targetPath);
https.get(logoUrl, (response) => {
  if (response.statusCode === 200) {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('Logo downloaded and saved successfully under /public/logo.png!');
      
      // Also generate PWA icons
      const iconsDir = path.join(targetDir, 'icons');
      if (!fs.existsSync(iconsDir)) {
        fs.mkdirSync(iconsDir, { recursive: true });
      }
      const targetIcons = [
        'apple-touch-icon.png',
        'screenshot-mobile.png',
        'screenshot-desktop.png',
        'icon-192.png',
        'icon-512.png',
      ];
      for (const iconName of targetIcons) {
        const destPath = path.join(iconsDir, iconName);
        fs.copyFileSync(targetPath, destPath);
        console.log(`[PWA Boost] Created dynamic fallback icon under /public/icons/${iconName}`);
      }
    });
  } else {
    console.error(`Failed to download icon. Status code: ${response.statusCode}`);
  }
}).on('error', (err) => {
  fs.unlink(targetPath, () => {});
  console.error('Error downloading logo:', err.message);
});
