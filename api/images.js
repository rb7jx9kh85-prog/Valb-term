const { randomUUID } = require('node:crypto');

const PROJECT_ID = 'valb-therm-admin';
const FIREBASE_API_KEY = 'AIzaSyAqSKnjx3qcuhNWtWAU6yrzLVmfpG7apSE';
const MAX_BYTES = 3 * 1024 * 1024;
const PATH_PATTERN = /^project-cards\/[a-f0-9-]{36}\.(jpg|png|webp)$/;

async function requireAdmin(token, fetcher, report = function () {}) {
  if (!token || token.length > 12000) return false;
  report('auth', 'Vérification du jeton de connexion auprès de Firebase…');
  const accountResponse = await fetcher(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }), signal: AbortSignal.timeout(10000) }
  );
  if (!accountResponse.ok) return false;
  const account = await accountResponse.json();
  const uid = account.users?.[0]?.localId;
  if (!uid || account.users[0].disabled) return false;
  report('permissions', 'Connexion reconnue. Vérification du droit administrateur dans Firestore…');
  const permission = await fetcher(
    'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID +
    '/databases/(default)/documents/admins/' + encodeURIComponent(uid),
    { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(10000) }
  );
  if (!permission.ok) return false;
  const admin = await permission.json();
  return admin.fields?.active?.booleanValue === true;
}

function imageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return { extension: 'jpg', mime: 'image/jpeg' };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { extension: 'png', mime: 'image/png' };
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return { extension: 'webp', mime: 'image/webp' };
  return null;
}

function createHandler({ fetcher = fetch, env = process.env } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (!['POST', 'DELETE'].includes(req.method)) {
      res.setHeader('Allow', 'POST, DELETE');
      return res.status(405).json({ error: 'Méthode non autorisée.' });
    }
    const streaming = req.headers.accept === 'application/x-ndjson';
    let stage = 'receive';
    const operationId = randomUUID();
    function report(next, message) {
      stage = next;
      if (!streaming) return;
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
        res.setHeader('X-Accel-Buffering', 'no');
      }
      res.write(JSON.stringify({type:'step',stage,message,operationId}) + '\n');
    }
    function respond(status, data) {
      if (!streaming) return res.status(status).json(data);
      if (!res.headersSent) res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.write(JSON.stringify({type:status >= 400 ? 'error' : 'result',stage,operationId,status,...data}) + '\n');
      res.end();
    }
    try {
      report('receive', 'Le serveur Vercel a reçu le transfert.');
      const token = /^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1];
      if (!await requireAdmin(token, fetcher, report)) return respond(403, { error: 'Connexion ou droit administrateur refusé par Firebase. Déconnectez-vous puis reconnectez-vous.' });
      report('configuration', 'Droit administrateur confirmé. Vérification de la configuration Cloudinary…');
      const cloud = env.CLOUDINARY_CLOUD_NAME;
      const key = env.CLOUDINARY_API_KEY;
      const secret = env.CLOUDINARY_API_SECRET;
      if (!cloud || !/^[a-z0-9_-]+$/i.test(cloud) || !key || !secret) {
        const missing = ['CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'].filter(name => !env[name]);
        return respond(503, { error: missing.length ? 'Variables Vercel manquantes : ' + missing.join(', ') + '. Enregistrez-les puis redéployez.' : 'CLOUDINARY_CLOUD_NAME invalide : vérifiez sa valeur dans Vercel.' });
      }
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);
      if (!body || typeof body !== 'object') return respond(400, { error: 'Données invalides.' });
      const authorization = 'Basic ' + Buffer.from(key + ':' + secret).toString('base64');
      const base = 'https://api.cloudinary.com/v1_1/' + cloud + '/image/';
      if (req.method === 'DELETE') {
        if (typeof body.storagePath !== 'string' || !PATH_PATTERN.test(body.storagePath)) {
          return respond(400, { error: 'Chemin de photo invalide.' });
        }
        report('cloudinary-delete', 'Suppression de la photo auprès de Cloudinary…');
        const response = await fetcher(base + 'destroy', {
          method: 'POST', headers: { Authorization: authorization },
          body: new URLSearchParams({ public_id: body.storagePath.replace(/\.(jpg|png|webp)$/, ''), invalidate: 'true' }),
          signal: AbortSignal.timeout(20000)
        });
        const result = await response.json();
        if (!response.ok || !['ok', 'not found'].includes(result.result)) throw new Error('cloudinary-delete');
        report('cloudinary-deleted', 'Cloudinary confirme que la photo est supprimée ou déjà absente.');
        return respond(200, { ok: true });
      }
      report('validation', 'Configuration présente. Vérification du fichier et de sa taille…');
      if (typeof body.image !== 'string' || body.image.length > Math.ceil(MAX_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.image)) {
        return respond(400, { error: 'Photo invalide ou trop volumineuse.' });
      }
      const buffer = Buffer.from(body.image, 'base64');
      const type = imageType(buffer);
      if (!buffer.length || buffer.length > MAX_BYTES || !type) {
        return respond(400, { error: 'Seules les photos JPG, PNG et WebP jusqu’à 3 Mo après optimisation sont acceptées.' });
      }
      const publicId = 'project-cards/' + randomUUID();
      const form = new FormData();
      form.set('file', new Blob([buffer], { type: type.mime }), 'photo.' + type.extension);
      form.set('public_id', publicId);
      form.set('overwrite', 'false');
      form.set('format', type.extension);
      report('cloudinary-upload', 'Fichier validé. Envoi de la photo à Cloudinary (' + Math.round(buffer.length / 1024) + ' Ko)…');
      const response = await fetcher(base + 'upload', {
        method: 'POST', headers: { Authorization: authorization }, body: form,
        signal: AbortSignal.timeout(30000)
      });
      const result = await response.json();
      if (!response.ok) return respond(502, { error: 'Cloudinary refuse l’import (HTTP ' + response.status + '). ' + (response.status === 401 || response.status === 403 ? 'Vérifiez que la clé API et le secret correspondent au même compte Cloudinary.' : 'Vérifiez le format de la photo, les quotas et les restrictions du compte Cloudinary.') });
      if (!response.ok || result.public_id !== publicId || !result.secure_url?.startsWith('https://res.cloudinary.com/' + cloud + '/')) {
        throw new Error('cloudinary-upload');
      }
      report('cloudinary-confirmed', 'Cloudinary a confirmé le stockage de la photo.');
      return respond(201, { imageUrl: result.secure_url, storagePath: publicId + '.' + type.extension });
    } catch (error) {
      console.error('Image operation failed', { code: error.name, message: ['cloudinary-upload', 'cloudinary-delete'].includes(error.message) ? error.message : 'request-failed' });
      return respond(502, { error: 'Échec à l’étape « ' + stage + ' ». ' + (error.name === 'TimeoutError' || error.name === 'AbortError' ? 'Le service n’a pas répondu dans le délai prévu.' : 'Le service distant est indisponible ou sa réponse est invalide.') });
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
