const { randomUUID } = require('node:crypto');

const PROJECT_ID = 'valb-therm-admin';
const FIREBASE_API_KEY = 'AIzaSyAqSKnjx3qcuhNWtWAU6yrzLVmfpG7apSE';
const MAX_BYTES = 3 * 1024 * 1024;
const PATH_PATTERN = /^project-cards\/[a-f0-9-]{36}\.(jpg|png|webp)$/;

async function requireAdmin(token, fetcher) {
  if (!token || token.length > 12000) return false;
  const accountResponse = await fetcher(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }), signal: AbortSignal.timeout(10000) }
  );
  if (!accountResponse.ok) return false;
  const account = await accountResponse.json();
  const uid = account.users?.[0]?.localId;
  if (!uid || account.users[0].disabled) return false;
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
    try {
      const token = /^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1];
      if (!await requireAdmin(token, fetcher)) return res.status(403).json({ error: 'Connexion administrateur requise.' });
      const cloud = env.CLOUDINARY_CLOUD_NAME;
      const key = env.CLOUDINARY_API_KEY;
      const secret = env.CLOUDINARY_API_SECRET;
      if (!cloud || !/^[a-z0-9_-]+$/i.test(cloud) || !key || !secret) {
        return res.status(503).json({ error: 'Les trois variables Cloudinary doivent être enregistrées dans Vercel, puis le site redéployé.' });
      }
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);
      if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Données invalides.' });
      const authorization = 'Basic ' + Buffer.from(key + ':' + secret).toString('base64');
      const base = 'https://api.cloudinary.com/v1_1/' + cloud + '/image/';
      if (req.method === 'DELETE') {
        if (typeof body.storagePath !== 'string' || !PATH_PATTERN.test(body.storagePath)) {
          return res.status(400).json({ error: 'Chemin de photo invalide.' });
        }
        const response = await fetcher(base + 'destroy', {
          method: 'POST', headers: { Authorization: authorization },
          body: new URLSearchParams({ public_id: body.storagePath.replace(/\.(jpg|png|webp)$/, ''), invalidate: 'true' }),
          signal: AbortSignal.timeout(20000)
        });
        const result = await response.json();
        if (!response.ok || !['ok', 'not found'].includes(result.result)) throw new Error('cloudinary-delete');
        return res.status(200).json({ ok: true });
      }
      if (typeof body.image !== 'string' || body.image.length > Math.ceil(MAX_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.image)) {
        return res.status(400).json({ error: 'Photo invalide ou trop volumineuse.' });
      }
      const buffer = Buffer.from(body.image, 'base64');
      const type = imageType(buffer);
      if (!buffer.length || buffer.length > MAX_BYTES || !type) {
        return res.status(400).json({ error: 'Seules les photos JPG, PNG et WebP jusqu’à 3 Mo après optimisation sont acceptées.' });
      }
      const publicId = 'project-cards/' + randomUUID();
      const form = new FormData();
      form.set('file', new Blob([buffer], { type: type.mime }), 'photo.' + type.extension);
      form.set('public_id', publicId);
      form.set('overwrite', 'false');
      form.set('format', type.extension);
      const response = await fetcher(base + 'upload', {
        method: 'POST', headers: { Authorization: authorization }, body: form,
        signal: AbortSignal.timeout(30000)
      });
      const result = await response.json();
      if (!response.ok || result.public_id !== publicId || !result.secure_url?.startsWith('https://res.cloudinary.com/' + cloud + '/')) {
        throw new Error('cloudinary-upload');
      }
      return res.status(201).json({ imageUrl: result.secure_url, storagePath: publicId + '.' + type.extension });
    } catch (error) {
      console.error('Image operation failed', { code: error.name, message: ['cloudinary-upload', 'cloudinary-delete'].includes(error.message) ? error.message : 'request-failed' });
      return res.status(502).json({ error: 'L’opération photo a échoué. Vérifiez les clés Cloudinary et réessayez.' });
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
