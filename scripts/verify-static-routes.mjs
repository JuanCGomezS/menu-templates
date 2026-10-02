import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

const requiredFiles = ['index.html', 'login/index.html', 'admin/index.html', 'admin/store/index.html', 't/index.html', '404.html'];

for (const file of requiredFiles) {
  await access(resolve('dist', file));
}


console.log(`Rutas estáticas verificadas: ${requiredFiles.join(', ')}`);
