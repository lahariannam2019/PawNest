import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const manifestPath = path.resolve('src/content/image-manifest.json');
const outputDir = path.resolve('public/images');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed with status ${res.statusCode}`));
      }
      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
      fileStream.on('error', reject);
    }).on('error', reject);
  });
}

async function run() {
  console.log(`Downloading ${manifest.length} images to ${outputDir}...`);
  for (const item of manifest) {
    const filename = `${item.id}.jpg`;
    const dest = path.join(outputDir, filename);
    if (!fs.existsSync(dest)) {
      try {
        console.log(`Downloading ${item.id} from ${item.file}...`);
        await downloadFile(item.file, dest);
        console.log(`✓ Saved ${filename}`);
      } catch (err) {
        console.warn(`! Failed to download ${item.id}:`, err.message);
      }
    } else {
      console.log(`- Exists: ${filename}`);
    }
  }
  console.log('Finished downloading assets.');
}

run();
