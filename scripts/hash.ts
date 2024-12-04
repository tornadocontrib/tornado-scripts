import path from 'path'
import { readFile, readdir, writeFile } from 'fs/promises';
import { bytesToBase64, digest } from '../src';

async function content(file: string) {
    const content = new Uint8Array(await readFile(file));

    const hash = 'sha384-' + bytesToBase64(await digest(content));

    return hash;
}

async function hash() {
    const staticFiles = await readdir('dist');

    const hashes = {} as {
        [key: string]: string;
    };

    for (const filePath of staticFiles) {
        const file = path.join('dist', filePath).replaceAll(path.sep, path.posix.sep);

        if (!['.js', '.mjs'].includes(path.extname(file))) {
            continue;
        }

        const hash = await content(file);

        hashes[file] = hash;
    }

    await writeFile('dist/hashes.json', JSON.stringify(hashes, null, 2));

    console.log('hashes', hashes);
}
hash();