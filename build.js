const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const forge = require('node-forge');

// Zielordner prüfen und erstellen
const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
}

// Zielpfad für die ZIP-Datei
const output = fs.createWriteStream(path.join(buildDir, 'no-more-anime.crx'));
const archive = archiver('zip', { zlib: { level: 9 } });

// Fehlerbehandlung
output.on('close', () => {
    console.log(`Build erfolgreich! ${archive.pointer()} Bytes wurden geschrieben.`);
});

archive.on('error', (err) => {
    console.error('Ein Fehler ist aufgetreten:', err);
    throw err;
});

// Initialisiere das ZIP-Archiv
archive.pipe(output);

// Hinzufügen des Quellverzeichnisses
const dirpath = './src'; // Quellverzeichnis, passe es an dein Projekt an
const destpath = '';     // Innerhalb der ZIP direkt auf oberster Ebene
const data = {};         // Optional, hier leer

archive.directory(dirpath, destpath, data);

// Beende das Archivieren
archive.finalize().then(r => console.log("Archiver finalized!"));

// ----- Erstelle die .pem-Datei (privater Schlüssel) -----
const pki = forge.pki;

// Erstelle das Schlüsselpaar
const keypair = pki.rsa.generateKeyPair(2048);

// Exportiere den privaten Schlüssel im PEM-Format
const privateKeyPem = pki.privateKeyToPem(keypair.privateKey);

// Speicher die .pem-Datei
const pemPath = path.join(buildDir, 'private-key.pem');
fs.writeFileSync(pemPath, privateKeyPem);
console.log('Private Schlüssel (pem) erfolgreich erstellt und gespeichert!');
