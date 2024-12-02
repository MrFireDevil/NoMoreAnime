const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const forge = require('node-forge');

const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
}

const output = fs.createWriteStream(path.join(buildDir, 'no-more-anime.zip'));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
    console.log(`Build erfolgreich! ${archive.pointer()} Bytes wurden geschrieben.`);
});

archive.on('error', (err) => {
    console.error('Ein Fehler ist aufgetreten:', err);
    throw err;
});

archive.pipe(output);


const dirpath = './src';
const destpath = '';
const data = {};

archive.directory(dirpath, destpath, data);

archive.finalize().then(r => console.log("Archiver finalized!"));

const pemPath = path.join(buildDir, 'private-key.pem');

if (fs.existsSync(pemPath)) {
    console.log('Private key (pem) already exists. Is reused.');
} else {
    const pki = forge.pki;
    const keypair = pki.rsa.generateKeyPair(2048);
    const privateKeyPem = pki.privateKeyToPem(keypair.privateKey);
    fs.writeFileSync(pemPath, privateKeyPem);
    console.log('Private key (pem) successfully created and saved!');
}
