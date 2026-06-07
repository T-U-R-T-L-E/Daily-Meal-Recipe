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
    });
  } else {
    console.error(`Failed to download icon. Status code: ${response.statusCode}`);
  }
}).on('error', (err) => {
  fs.unlink(targetPath, () => {});
  console.error('Error downloading logo:', err.message);
});
