import http from 'http';
import fs from 'fs';
import request from 'request';
import { resolve } from 'dns';
import tar from 'tar-fs';
import decompress from 'decompress';
import decompressTarxz from 'decompress-tarxz';
import progress from 'request-progress';
import unzipper from 'unzipper';

import { exec } from 'child-process-promise';
import { promisify } from 'util';
const execPromise = promisify(exec);

doStuff().then(() => {
  console.log('All done.');
});

async function doStuff() {
  // const vlcUrl = 'https://download.videolan.org/pub/videolan/vlc/3.0.4/win64/vlc-3.0.4-win64.exe';
  const vlcUrl = 'https://download.videolan.org/pub/videolan/vlc/3.0.4/win64/vlc-3.0.4-win64.zip';
  // const vlcFile = 'vlc.exe';
  const vlcFile = 'vlc.zip';
  const expectedSize = 41486400;

  const stats = fs.statSync(vlcFile);
  const fileSizeInBytes = stats.size;
  console.log('Downloading VLC...');
  if (fileSizeInBytes !== expectedSize) {
    await getFile2(vlcUrl, vlcFile);
  } else {
    console.log('VLC file seems to be the right size already, no need to download.');
  }

  await unzipFile(vlcFile, '.');

  const asdf = await execPromise('getCdDriveLetter.bat');
  console.log(`ADF: ${asdf}`);
}

// async function untarFile(tarFile, destination) {
//   await decompress(tarFile, '.', {
//     plugins: [decompressTarxz()],
//   });
// }

function getFile2(vlcUrl, fileName) {
  return new Promise(async (resolve, reject) => {
    progress(request(vlcUrl))
      .on('progress', (state) => {
        console.log(`%${Math.trunc(state.percent * 100)}`);
      })
      .on('error', (error) => {
        console.log(error.message);
        console.log(`${error.stack}`);
        reject();
      })
      .on('end', () => {
        resolve();
      })
      .pipe(fs.createWriteStream(fileName));
  });
}

function unzipFile(zipFile, destination) {
  const stream = fs.createReadStream(zipFile).pipe(unzipper.Extract({ path: destination }));
  return makePromiseStream(stream);
}

function getFile(vlcUrl, fileName): Promise<any> {
  console.log('Downloading VLC...');
  const stream = request(vlcUrl).pipe(fs.createWriteStream(fileName));
  return makePromiseStream(stream);
}

function makePromiseStream(stream) {
  return new Promise(async (resolve, reject) => {
    try {
      stream.on('finish', () => {
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}
