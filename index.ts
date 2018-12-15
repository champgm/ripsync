import http from 'http';
import fs from 'fs-extra';
import request from 'request';
import { resolve } from 'dns';
import tar from 'tar-fs';
import decompress from 'decompress';
import decompressTarxz from 'decompress-tarxz';
import progress from 'request-progress';
import unzipper from 'unzipper';
import AdmZip from 'adm-zip';
import inquirer from 'inquirer';
import { spawn } from 'child_process';

import { exec } from 'child-process-promise';
import { promisify } from 'util';
const execPromise = promisify(exec);

const ripperUrl = 'https://github.com/enzo1982/freac/releases/download/v1.0.32/freac-1.0.32-bin.zip';
const ripperFileName = 'ripper.zip';
const expectedSize = 6380756;
const questions = [
  {
    type: 'input',
    name: 'title',
    message: 'Please enter title:',
  },
];

inquirer.prompt(questions).then((answers) => {
  const title = answers.title;
  doStuff(title).then(() => {
    console.log('');
  });
});

async function doStuff(title: string) {
  await downloadRipper();
  await unzipFile();
  await rip(title);
  const usbDriveLetter = await getUsbDriveLetter();
  if (usbDriveLetter) {
    const newPath = await moveFolder(title, usbDriveLetter);
    console.log(`All done. Your files should now be in '${newPath}'`);
  } else {
    console.log("No USB drive with the name 'AUDIOBOOKS' was found.");
    console.log('Please insert one.');
  }
}

// async function moveFolder(title: string, usbDriveLetter: string) {
//   console.log('');
//   process.stdout.write('Moving files to USB drive...');
//   const oldPath = `./${title}`;
//   const newPath = `${usbDriveLetter}/${title}`;
//   await fs.renameSync(oldPath, newPath);
//   console.log(' Done.');
//   return newPath;
// }

async function moveFolder(title: string, usbDriveLetter: string) {
  console.log('');
  process.stdout.write('Moving files to USB drive...');
  const oldPath = `./${title}`;
  const newPath = `${usbDriveLetter}/${title}`;
  await fs.moveSync(oldPath, newPath);
  console.log(' Done.');
  return newPath;
}

async function downloadRipper() {
  console.log('');
  console.log('Checking for ripper...');
  let fileSizeInBytes;
  try {
    const stats = fs.statSync(ripperFileName);
    fileSizeInBytes = stats.size;
  } catch (error) {
    fileSizeInBytes = 0;
  }
  if (fileSizeInBytes !== expectedSize) {
    console.log('  Existing ripper file is the wrong size.');
    console.log(`  Expected: ${expectedSize},`);
    console.log(`  Actual  : ${fileSizeInBytes},`);
    process.stdout.write('  Downloading ripper...');
    console.log(' Done.');
    await getFile();
  } else {
    console.log('  Ripper file present.');
  }
  console.log('');
}

function getFile() {
  return new Promise(async (resolve, reject) => {
    progress(request(ripperUrl))
      .on('error', (error) => {
        console.log('');
        console.log('Error ocurred:');
        console.log(error.message);
        console.log(`${error.stack}`);
        reject();
      })
      .on('end', () => {
        resolve();
      })
      .pipe(fs.createWriteStream(ripperFileName));
  });
}

async function getUsbDriveLetter() {
  const driveEntry: string = await execPromise('wmic logicaldisk get caption,volumename');
  const driveEntries = driveEntry.split('\n');
  for (const entry of driveEntries) {
    if (entry.includes('AUDIOBOOKS')) {
      return entry.substr(0, 2);
    }
  }
  return;
}

async function rip(title: string): Promise<any> {
  // await execPromise(`freaccmd.exe -q 0 -d ${title} -cd 0 -track all -cddb`);
  return new Promise((resolve, reject) => {
    const exe = 'freac-1.0.32-bin\\freaccmd.exe';
    // const options = ['-q', '0', '-d', title, '-cd', '0', '-track', 'all', '-cddb'];

    const options = ['-q', '0', '-d', title, '-cd', '0', '-track', '1', '-cddb'];

    let error = false;
    const ripCommand = spawn(exe, options);
    ripCommand.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    ripCommand.stderr.on('data', (data) => {
      console.log(data.toString());
      error = true;
    });
    ripCommand.on('exit', (code) => {
      console.log(code.toString());
      if (error) {
        reject();
      } else {
        resolve();
      }
    });
  });
}

async function unzipFile() {
  const zip = new AdmZip(`./${ripperFileName}`);
  zip.extractAllTo('./', true);
}
