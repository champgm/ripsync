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
  // const vlcUrl = 'https://download.videolan.org/pub/videolan/vlc/3.0.4/win64/vlc-3.0.4-win64.zip';
  const freeAcUrl = 'https://github.com/enzo1982/freac/releases/download/v1.0.32/freac-1.0.32-bin.zip';
  // const vlcFile = 'vlc.exe';
  // const vlcFile = 'vlc.zip';

  // const expectedSize = 70270025;
  const freeAcFile = 'freac-1.0.32-bin.zip';

  console.log('Checking for VLC...');
  let fileSizeInBytes;
  try {
    const stats = fs.statSync(vlcFile);
    fileSizeInBytes = stats.size;
  } catch (error) {
    console.log("Couldn't find VLC file, will download.");
  }
  if (fileSizeInBytes !== expectedSize) {
    console.log(`Existing VLC file is the wrong size,
expected ${expectedSize},
 but got ${fileSizeInBytes},
downloading again...`);
    await getFile2(vlcUrl, vlcFile);
  } else {
    console.log('VLC file seems to be the right size already, no need to download.');
  }

  // await unzipFile(vlcFile, '.');

  console.log('Unzipping...');
  await execPromise(`unzip -o ${vlcFile} -d .`);

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

async function unzipFile(zipFile, destination) {
  console.log('Unzipping VLC file...');
  const stream = fs.createReadStream(zipFile).pipe(unzipper.Extract({ path: destination }));
  // await makePromiseStream(stream);

  console.log('Extracted.');
}

function getFile(vlcUrl, fileName): Promise<any> {
  console.log('Downloading VLC...');
  const stream = request(vlcUrl).pipe(fs.createWriteStream(fileName));
  return makePromiseStream(stream);
}

function makePromiseStream(stream) {
  return new Promise(async (resolve, reject) => {
    try {
      stream.on('close', () => {
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}
