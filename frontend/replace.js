import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('/Users/apple/Downloads/learnly-ai/src', function(filePath) {
  if (filePath.endsWith('.jsx') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let replaced = content.replace(/bg-white/g, 'bg-surface');
    if (content !== replaced) {
      fs.writeFileSync(filePath, replaced, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
