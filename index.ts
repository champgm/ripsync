import fs from 'fs-extra';
import request from 'request';
import progress from 'request-progress';
import AdmZip from 'adm-zip';
import inquirer from 'inquirer';
import { spawn } from 'child_process';
import { exec } from 'child-process-promise';
import { promisify } from 'util';
import isValidFilename from 'valid-filename';
const execPromise = promisify(exec);

const ripperUrl = 'https://github.com/enzo1982/freac/releases/download/v1.0.32/freac-1.0.32-bin.zip';
const ripperFileName = 'ripper.zip';
const expectedSize = 6380756;
const questions = [
  {
    type: 'input',
    name: 'title',
    message: 'Please enter the title:',
    validate: (title) => {
      const isValid = isValidFilename(title);
      if (isValid) {
        return true;
      }
      return `The title, '${title}' would result in invalid file name(s)\nPlease specify something different.`;
    },
  },
];

console.log('');
inquirer.prompt(questions).then((answers) => {
  const title = answers.title;
  ripSync(title).then(() => {
    console.log('');
  });
});

async function ripSync(title: string) {
  await downloadRipper();
  await unzipFile();
  await rip(title);
  const usbDriveLetter = await getUsbDriveLetter();
  if (usbDriveLetter) {
    const newPath = await moveFolder(title, usbDriveLetter);
    console.log(`All done. Your files should now be in '${newPath}'`);
  } else {
    console.log("No USB drive with the name 'AUDIOBOOKS' was found. Will not move files");
  }
}

async function moveFolder(title: string, usbDriveLetter: string) {
  console.log('');
  process.stdout.write('Moving files to USB drive...');
  const oldPath = `./${title}`;
  const newPath = `${usbDriveLetter}/${title}`;
  await fs.move(oldPath, newPath, { overwrite: true });
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
    await getFile();
    console.log(' Done.');
  } else {
    console.log('  Ripper file present.');
  }
}

async function getFile() {
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
  console.log('');
  console.log('Ripping...');
  return new Promise((resolve, reject) => {
    const exe = 'freac-1.0.32-bin\\freaccmd.exe';
    const options = ['-q', '0', '-t', '500', '-d', title, '-cd', '0', '-track', 'all', '-cddb', '-p', 'Track<track>'];

    let error = false;
    const ripCommand = spawn(exe, options);
    ripCommand.stdout.on('data', (data) => {
      console.log(`  ${data.toString()}`);
    });
    ripCommand.stderr.on('data', (data) => {
      console.log(`  ${data.toString()}`);
      error = true;
    });
    ripCommand.on('exit', (code) => {
      if (error) {
        console.log('  Failed.');
        reject();
      } else {
        console.log('  Done.');
        resolve();
      }
    });
  });
}

async function unzipFile() {
  console.log('');
  process.stdout.write('Unzipping ripper...');
  const zip = new AdmZip(`./${ripperFileName}`);
  zip.extractAllTo('./', true);
  console.log(' Done.');
}
