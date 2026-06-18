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

function downloadLogo() {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(targetPath);
    let hasResolved = false;

    const req = https.get(logoUrl, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        
        file.on('finish', () => {
          file.close(() => {
            console.log('Logo downloaded and saved successfully under /public/logo.png!');
            
            try {
              // Generate PWA icons
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
            } catch (pwaErr) {
              console.error('Error generating PWA icons:', pwaErr.message);
            }
            
            if (!hasResolved) {
              hasResolved = true;
              resolve(true);
            }
          });
        });
      } else {
        console.error(`Failed to download icon. Status code: ${response.statusCode}`);
        file.close();
        if (!hasResolved) {
          hasResolved = true;
          resolve(false);
        }
      }
    });

    req.on('error', (err) => {
      console.error('Error downloading logo:', err.message);
      file.close(() => {
        fs.unlink(targetPath, () => {});
      });
      if (!hasResolved) {
        hasResolved = true;
        resolve(false);
      }
    });

    // Timeout request after 10 seconds to avoid blocking builds in restricted environments
    req.setTimeout(10000, () => {
      console.warn('Logo download timed out after 10 seconds.');
      req.destroy();
      file.close(() => {
        fs.unlink(targetPath, () => {});
      });
      if (!hasResolved) {
        hasResolved = true;
        resolve(false);
      }
    });
  });
}

async function run() {
  try {
    const success = await downloadLogo();
    if (!success) {
      console.log('Falling back to default visual structure. Outbound networking may be constrained.');
    }
  } catch (err) {
    console.error('Unexpected script failure:', err);
  }
  // Guarantee clean exit 0 so we never block package compilation
  process.exit(0);
}

run();
