import path from 'node:path';
import {build} from 'vite';

const root=path.resolve(import.meta.dirname,'..');
await build({root,base:'/',build:{target:'esnext',outDir:path.join(root,'outputs','site-build'),
  emptyOutDir:true,rollupOptions:{input:Object.fromEntries(
    ['index','preview','evidence','workflow'].map(name=>
      [name,path.join(root,'engine',`${name}.html`)]))}}});
