// Script to copy all test files to the USB stryker-tmp/test directory after each run
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');

const TEST_SRC = path.resolve(__dirname, '../test');
const USB_TEST_DEST = '/run/media/cyber44/e7e278fe-0fb7-4d32-bb48-8e6959402b8f/stryker-tmp/test';

function copyTests(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    console.warn(`[copy-tests-to-usb] Source directory does not exist: ${srcDir}`);
    return;
  }
  fse.ensureDirSync(destDir);
  const files = fs.readdirSync(srcDir);
  files.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);
    if (fs.statSync(srcPath).isDirectory()) {
      copyTests(srcPath, destPath);
    } else if (file.endsWith('.test.js') || file.endsWith('.test.ts')) {
      try {
        fse.copySync(srcPath, destPath);
        console.log(`[copy-tests-to-usb] Copied: ${srcPath} -> ${destPath}`);
      } catch (err) {
        console.error(`[copy-tests-to-usb] Failed to copy ${srcPath}:`, err);
      }
    }
  });
}

if (fs.existsSync('/run/media/cyber44/e7e278fe-0fb7-4d32-bb48-8e6959402b8f')) {
  copyTests(TEST_SRC, USB_TEST_DEST);
  console.log('[copy-tests-to-usb] All test files copied to USB for record-keeping.');
} else {
  console.warn('[copy-tests-to-usb] USB not mounted, skipping copy.');
}
