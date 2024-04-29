import path from 'path';
import { stat, mkdir, readFile, writeFile } from 'fs/promises';
import { zip, unzip, AsyncZippable, Unzipped } from 'fflate';
import { BaseEvents, MinimalEvents } from './events';

export async function existsAsync(fileOrDir: string): Promise<boolean> {
  try {
    await stat(fileOrDir);

    return true;
  } catch {
    return false;
  }
}

export function zipAsync(file: AsyncZippable): Promise<Uint8Array> {
  return new Promise((res, rej) => {
    zip(file, { mtime: new Date('1/1/1980') }, (err, data) => {
      if (err) {
        rej(err);
        return;
      }
      res(data);
    });
  });
}

export function unzipAsync(data: Uint8Array): Promise<Unzipped> {
  return new Promise((res, rej) => {
    unzip(data, {}, (err, data) => {
      if (err) {
        rej(err);
        return;
      }
      res(data);
    });
  });
}

export async function saveUserFile({
  fileName,
  userDirectory,
  dataString,
}: {
  fileName: string;
  userDirectory: string;
  dataString: string;
}) {
  fileName = fileName.toLowerCase();

  const filePath = path.join(userDirectory, fileName);

  const payload = await zipAsync({
    [fileName]: new TextEncoder().encode(dataString),
  });

  if (!(await existsAsync(userDirectory))) {
    await mkdir(userDirectory, { recursive: true });
  }

  await writeFile(filePath + '.zip', payload);
  await writeFile(filePath, dataString);
}

export async function loadSavedEvents<T extends MinimalEvents>({
  name,
  userDirectory,
  deployedBlock,
}: {
  name: string;
  userDirectory: string;
  deployedBlock: number;
}): Promise<BaseEvents<T>> {
  const filePath = path.join(userDirectory, `${name}.json`.toLowerCase());

  if (!(await existsAsync(filePath))) {
    return {
      events: [] as T[],
      lastBlock: null,
    };
  }

  try {
    const events = JSON.parse(await readFile(filePath, { encoding: 'utf8' })) as T[];

    return {
      events,
      lastBlock: events && events.length ? events[events.length - 1].blockNumber : deployedBlock,
    };
  } catch (err) {
    console.log('Method loadSavedEvents has error');
    console.log(err);
    return {
      events: [],
      lastBlock: deployedBlock,
    };
  }
}

export async function download({ name, cacheDirectory }: { name: string; cacheDirectory: string }) {
  const fileName = `${name}.json`.toLowerCase();
  const zipName = `${fileName}.zip`;
  const zipPath = path.join(cacheDirectory, zipName);

  const data = await readFile(zipPath);
  const { [fileName]: content } = await unzipAsync(data);

  return new TextDecoder().decode(content);
}

export async function loadCachedEvents<T extends MinimalEvents>({
  name,
  cacheDirectory,
  deployedBlock,
}: {
  name: string;
  cacheDirectory: string;
  deployedBlock: number;
}): Promise<BaseEvents<T>> {
  try {
    const module = await download({ cacheDirectory, name });

    if (module) {
      const events = JSON.parse(module);

      const lastBlock = events && events.length ? events[events.length - 1].blockNumber : deployedBlock;

      return {
        events,
        lastBlock,
      };
    }

    return {
      events: [],
      lastBlock: deployedBlock,
    };
  } catch (err) {
    console.log('Method loadCachedEvents has error');
    console.log(err);
    return {
      events: [],
      lastBlock: deployedBlock,
    };
  }
}
