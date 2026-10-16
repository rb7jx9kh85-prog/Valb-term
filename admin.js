import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db, firebaseConfigured } from "./firebase-client.js";

const statuses = ["Nouveau", "En cours", "Rendez-vous", "Terminé"];
const loginView = document.querySelector("#auth-gate");
const appView = document.querySelector("#admin-app");
const loginForm = document.querySelector("#login-form");
const loginStatus = document.querySelector("#login-status");
const syncStatus = document.querySelector("#sync-status");
const currentUser = document.querySelector("#current-user");
const filter = document.querySelector("#filter");
const requestsBody = document.querySelector("#requests-body");
const meetingList = document.querySelector("#meeting-list");
const cardForm = document.querySelector("#card-form");
const cardFormStatus = document.querySelector("#card-form-status");
const cardList = document.querySelector("#admin-card-list");
const dialog = document.querySelector("#new-dialog");
const newForm = document.querySelector("#new-form");
let requests = [];
let cards = [];
let stopRequests = null;
let stopCards = null;

function safe(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character];
  });
}
function dateValue(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function formatDate(value) {
  const date = dateValue(value);
  return date ? date.toLocaleDateString("fr-CH", {day:"2-digit",month:"2-digit",year:"numeric"}) : "—";
}
function formatMeeting(value) {
  const date = dateValue(value);
  return date ? date.toLocaleString("fr-CH", {day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "";
}
function inputDate(value) {
  const date = dateValue(value);
  if (!date) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function setSync(message) { syncStatus.textContent = message; }
const operationLog = document.querySelector('#operation-log');
const operationState = document.querySelector('#operation-state');
let operationTimer = null;
let operationStarted = 0;
function logOperation(message, level = 'info') {
  const item = document.createElement('li');
  item.dataset.level = level;
  const time = document.createElement('time');
  time.textContent = new Date().toLocaleTimeString('fr-CH');
  const text = document.createElement('span');
  text.textContent = message;
  item.append(time, text);
  operationLog.append(item);
  while (operationLog.children.length > 120) operationLog.firstElementChild.remove();
  operationLog.scrollTop = operationLog.scrollHeight;
}
function beginOperation(message) {
  if (operationTimer) throw new Error('Une opération photo est déjà en cours.');
  operationStarted = Date.now();
  operationState.closest('section').dataset.busy = 'true';
  const updateClock = function () {
    const seconds = Math.floor((Date.now() - operationStarted) / 1000);
    operationState.textContent = 'En cours · ' + seconds + ' s' + (navigator.onLine ? '' : ' · connexion Internet interrompue');
  };
  updateClock();
  operationTimer = setInterval(updateClock, 1000);
  logOperation(message);
}
function finishOperation(message, level = 'success') {
  clearInterval(operationTimer);
  operationTimer = null;
  operationState.closest('section').dataset.busy = 'false';
  operationState.textContent = (level === 'error' ? 'Échec' : level === 'warning' ? 'À vérifier' : 'Terminé') + ' · ' + Math.round((Date.now() - operationStarted) / 1000) + ' s';
  logOperation(message, level);
}
function operationError(error) {
  return (error.code ? '[' + error.code + '] ' : '') + (error.message || 'Erreur inconnue.');
}
function validateImage(file) {
  if (!file) throw new Error("Choisissez une image.");
  if (!["image/jpeg","image/png","image/webp"].includes(file.type)) throw new Error("Utilisez une image JPG, PNG ou WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("L’image dépasse la limite de 5 Mo.");
}
async function imageRequest(method, body) {
  if (!auth.currentUser) throw new Error("Reconnectez-vous à l’administration.");
  logOperation('Récupération du jeton de connexion Firebase…');
  const token = await auth.currentUser.getIdToken();
  logOperation(method === 'POST' ? 'Transfert de la photo vers le serveur Vercel…' : 'Envoi de la demande de suppression au serveur…');
  const controller = new AbortController();
  const timeout = setTimeout(function () { controller.abort(); }, 70000);
  try {
    const response = await fetch('/api/images', {
      method:method, headers:{'Content-Type':'application/json',Accept:'application/x-ndjson',Authorization:'Bearer ' + token},
      body:JSON.stringify(body), signal:controller.signal
    });
    if (!response.headers.get('Content-Type')?.includes('application/x-ndjson')) {
      const result = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(result.error || 'Le serveur a répondu HTTP ' + response.status + '.');
      return result;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = '', result = null;
    function consume(line) {
      if (!line.trim()) return;
      const event = JSON.parse(line);
      if (event.type === 'step') logOperation(event.message);
      if (event.type === 'error') throw new Error(event.error + ' [étape : ' + event.stage + ' ; référence : ' + event.operationId + ']');
      if (event.type === 'result') result = event;
    }
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        pending += decoder.decode(chunk.value, {stream:true});
        const lines = pending.split('\n');
        pending = lines.pop();
        lines.forEach(consume);
      }
      pending += decoder.decode();
      consume(pending);
    } finally { reader.releaseLock(); }
    if (!result) throw new Error('Le serveur a interrompu sa réponse sans confirmer le résultat.');
    return result;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Aucune confirmation après 70 secondes. Vérifiez Cloudinary et la liste des cartes avant de réessayer.');
    throw error;
  } finally { clearTimeout(timeout); }
}
async function prepareImage(file) {
  if (file.size <= 3 * 1024 * 1024) return file;
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    const ratio = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    const optimized = await new Promise(function (resolve) { canvas.toBlob(resolve, "image/webp", 0.82); });
    if (!optimized || optimized.size > 3 * 1024 * 1024) throw new Error("Réduisez la taille de cette photo puis réessayez.");
    return optimized;
  } finally { URL.revokeObjectURL(url); }
}
async function uploadImage(file) {
  logOperation('Vérification de la photo sélectionnée…');
  validateImage(file);
  logOperation('Photo acceptée : ' + file.name + ' · ' + Math.round(file.size / 1024) + ' Ko.');
  logOperation(file.size > 3 * 1024 * 1024 ? 'Réduction de la photo dans le navigateur…' : 'Taille compatible : aucune réduction nécessaire.');
  const prepared = await prepareImage(file);
  logOperation('Préparation terminée : ' + Math.round(prepared.size / 1024) + ' Ko. Lecture du fichier…');
  const base64 = await new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () { resolve(String(reader.result).split(",")[1]); };
    reader.onerror = function () { reject(new Error("Lecture de la photo impossible.")); };
    reader.readAsDataURL(prepared);
  });
  logOperation('Lecture du fichier terminée.');
  return imageRequest("POST", {image:base64});
}
async function removeStoredImage(path) {
  if (!path) return true;
  try { await imageRequest("DELETE", {storagePath:path}); return true; }
  catch (error) {
    console.warn("Nettoyage de la photo impossible", error.message);
    setSync("Carte enregistrée, mais l’ancienne photo doit être supprimée dans Cloudinary.");
    logOperation('Nettoyage de la photo non confirmé : ' + operationError(error), 'warning');
    return false;
  }
}

function renderRequests() {
  const selected = filter.value;
  const shown = selected === "all" ? requests : requests.filter(function (item) { return item.status === selected; });
  requestsBody.innerHTML = shown.length ? shown.map(function (item) {
    const options = statuses.map(function (status) { return '<option ' + (status === item.status ? "selected" : "") + ">" + status + "</option>"; }).join("");
    return '<tr><td><strong>' + safe(item.name) + '</strong><small><a href="tel:' + safe(item.phone) + '">' + safe(item.phone || "Sans téléphone") + '</a></small><small><a href="mailto:' + safe(item.email) + '">' + safe(item.email || "Sans e-mail") + '</a></small></td><td><strong>' + safe(item.service || item.project) + '</strong><small>' + safe(item.project) + '</small>' + (item.message ? '<small class="request-message">' + safe(item.message) + '</small>' : "") + '</td><td>' + formatDate(item.createdAt) + '</td><td><span class="status status-' + safe((item.status || "Nouveau").toLowerCase().replaceAll(" ", "-")) + '">' + safe(item.status || "Nouveau") + '</span></td><td class="admin-actions"><select aria-label="Statut de ' + safe(item.name) + '" data-status-id="' + item.id + '">' + options + '</select><input aria-label="Rendez-vous de ' + safe(item.name) + '" data-meeting-id="' + item.id + '" type="datetime-local" value="' + inputDate(item.meeting) + '"><button class="delete-request" data-delete-id="' + item.id + '" type="button">Supprimer</button></td></tr>';
  }).join("") : '<tr><td colspan="5">Aucune demande pour ce statut.</td></tr>';
  document.querySelector("#count-all").textContent = requests.length;
  document.querySelector("#count-new").textContent = requests.filter(function (item) { return item.status === "Nouveau"; }).length;
  document.querySelector("#count-progress").textContent = requests.filter(function (item) { return item.status === "En cours"; }).length;
  document.querySelector("#count-meeting").textContent = requests.filter(function (item) { return item.meeting; }).length;
  const meetings = requests.filter(function (item) { return item.meeting; }).sort(function (a,b) { return dateValue(a.meeting) - dateValue(b.meeting); });
  meetingList.innerHTML = meetings.length ? meetings.map(function (item) {
    return '<div><span class="meeting-date">' + safe(formatMeeting(item.meeting)) + '</span><strong>' + safe(item.name) + '</strong><span>' + safe(item.project || item.service) + '</span></div>';
  }).join("") : "<p>Aucun rendez-vous enregistré.</p>";
}

function renderCards() {
  cardList.innerHTML = cards.length ? cards.map(function (card) {
    return '<article class="admin-content-card" data-card-id="' + card.id + '"><img alt="" src="' + safe(card.imageUrl) + '"><div class="admin-content-fields"><label>Titre<input data-field="title" maxlength="80" value="' + safe(card.title) + '"></label><label>Catégorie<select data-field="category">' + ["Sanitaire","Chauffage","Lavabos & salles de bains","Pompe à chaleur","Ventilation"].map(function (category) { return '<option ' + (category === card.category ? "selected" : "") + '>' + category + '</option>'; }).join("") + '</select></label><label class="wide">Description<textarea data-field="description" maxlength="220">' + safe(card.description) + '</textarea></label><label>Ordre<input data-field="order" min="0" type="number" value="' + Number(card.order || 0) + '"></label><label>Remplacer la photo<input accept="image/jpeg,image/png,image/webp" class="replace-image" data-field="image" type="file"></label><div class="card-actions"><label class="visibility-check"><input data-field="visible" type="checkbox" ' + (card.visible ? "checked" : "") + '> Visible</label><button data-move="-1" type="button">Monter</button><button data-move="1" type="button">Descendre</button><button class="save-card" data-save-card type="button">Enregistrer</button><button data-delete-card type="button">Supprimer</button></div></div></article>';
  }).join("") : "<p>Aucune carte ajoutée pour le moment.</p>";
}

async function verifyAdmin(user) {
  const snapshot = await getDoc(doc(db, "admins", user.uid));
  return snapshot.exists() && snapshot.data().active === true;
}
function startListeners() {
  if (stopRequests) stopRequests();
  if (stopCards) stopCards();
  stopRequests = onSnapshot(query(collection(db, "requests"), orderBy("createdAt", "desc")), function (snapshot) {
    requests = snapshot.docs.map(function (item) { return Object.assign({id:item.id}, item.data()); });
    renderRequests();
    setSync("Synchronisé avec Firebase");
  }, function (error) { console.error(error); setSync("Synchronisation impossible"); });
  stopCards = onSnapshot(query(collection(db, "projectCards"), orderBy("order", "asc")), function (snapshot) {
    cards = snapshot.docs.map(function (item) { return Object.assign({id:item.id}, item.data()); });
    renderCards();
    if (operationTimer) logOperation(snapshot.metadata.hasPendingWrites ? 'Firestore a reçu la modification localement ; confirmation du serveur en attente…' : 'Liste des cartes synchronisée avec Firestore.');
  }, function (error) { console.error(error); setSync("Cartes non synchronisées"); });
}

if (!firebaseConfigured) {
  loginStatus.textContent = "Firebase doit encore être relié au projet VALB-THERM.";
  loginForm.querySelector("button").disabled = true;
} else {
  setPersistence(auth, browserLocalPersistence).catch(console.error);
  onAuthStateChanged(auth, async function (user) {
    if (!user) {
      if (stopRequests) stopRequests();
      if (stopCards) stopCards();
      appView.hidden = true;
      loginView.hidden = false;
      return;
    }
    try {
      if (!await verifyAdmin(user)) {
        await signOut(auth);
        loginStatus.textContent = "Ce compte n’est pas autorisé.";
        return;
      }
      loginStatus.textContent = "";
      loginView.hidden = true;
      appView.hidden = false;
      currentUser.textContent = user.email || "Administrateur";
      startListeners();
    } catch (error) {
      console.error(error);
      loginStatus.textContent = "Impossible de vérifier les droits administrateur.";
    }
  });
}

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  const submit = loginForm.querySelector("button");
  const data = new FormData(loginForm);
  submit.disabled = true;
  loginStatus.textContent = "Connexion…";
  try {
    await signInWithEmailAndPassword(auth, String(data.get("email")).trim(), String(data.get("password")));
  } catch (error) {
    console.error(error);
    loginStatus.textContent = "E-mail ou mot de passe incorrect.";
  } finally { submit.disabled = false; }
});
document.querySelector("#logout").addEventListener("click", function () { signOut(auth); });
filter.addEventListener("change", renderRequests);
document.querySelector("#add-request").addEventListener("click", function () { dialog.showModal(); });

requestsBody.addEventListener("change", async function (event) {
  const statusId = event.target.dataset.statusId;
  const meetingId = event.target.dataset.meetingId;
  try {
    setSync("Enregistrement…");
    if (statusId) await updateDoc(doc(db, "requests", statusId), {status:event.target.value,updatedAt:serverTimestamp()});
    if (meetingId) {
      const meeting = event.target.value ? new Date(event.target.value) : null;
      await updateDoc(doc(db, "requests", meetingId), {meeting:meeting,status:meeting ? "Rendez-vous" : "En cours",updatedAt:serverTimestamp()});
    }
  } catch (error) { console.error(error); setSync("Modification non enregistrée"); }
});
requestsBody.addEventListener("click", async function (event) {
  const id = event.target.dataset.deleteId;
  if (!id || !window.confirm("Supprimer définitivement cette demande ?")) return;
  try { setSync("Suppression…"); await deleteDoc(doc(db, "requests", id)); }
  catch (error) { console.error(error); setSync("Suppression impossible"); }
});
newForm.addEventListener("submit", async function (event) {
  if (event.submitter && event.submitter.value === "cancel") return;
  event.preventDefault();
  if (!newForm.reportValidity()) return;
  const data = Object.fromEntries(new FormData(newForm));
  const meeting = data.meeting ? new Date(data.meeting) : null;
  try {
    await addDoc(collection(db, "requests"), {
      name:String(data.name).trim(),email:String(data.email || "").trim().toLowerCase(),phone:String(data.phone || "").trim(),service:String(data.service || "Autre"),project:String(data.project).trim(),message:String(data.message || "").trim(),status:meeting ? "Rendez-vous" : "Nouveau",meeting:meeting,source:"admin",createdAt:serverTimestamp(),updatedAt:serverTimestamp()
    });
    newForm.reset();
    dialog.close();
  } catch (error) { console.error(error); setSync("Ajout impossible"); }
});

cardForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  if (!cardForm.reportValidity()) return;
  if (operationTimer) return;
  beginOperation('Création d’une nouvelle carte.');
  const submit = cardForm.querySelector('button[type="submit"]');
  const data = new FormData(cardForm);
  submit.disabled = true;
  cardFormStatus.textContent = "Importation de l’image…";
  let uploaded = null;
  try {
    uploaded = await uploadImage(data.get("image"));
    cardFormStatus.textContent = 'Photo stockée. Enregistrement de la carte dans Firestore…';
    logOperation('Enregistrement du titre, de la photo et de la visibilité dans Firestore…');
    await addDoc(collection(db, "projectCards"), {
      title:String(data.get("title")).trim(),category:String(data.get("category")),description:String(data.get("description")).trim(),order:Number(data.get("order") || 0),visible:data.get("visible") === "on",imageUrl:uploaded.imageUrl,storagePath:uploaded.storagePath,createdAt:serverTimestamp(),updatedAt:serverTimestamp()
    });
    cardForm.reset();
    cardForm.querySelector('[name="visible"]').checked = true;
    cardFormStatus.textContent = data.get('visible') === 'on' ? 'Carte enregistrée et visible sur le site.' : 'Carte enregistrée, masquée sur le site.';
    finishOperation(cardFormStatus.textContent + ' Confirmation du serveur Firestore reçue.');
  } catch (error) {
    console.error(error);
    if (uploaded) await removeStoredImage(uploaded.storagePath);
    cardFormStatus.textContent = operationError(error);
    finishOperation(cardFormStatus.textContent, 'error');
  } finally { submit.disabled = false; }
});

cardList.addEventListener("click", async function (event) {
  const article = event.target.closest("[data-card-id]");
  if (!article) return;
  const id = article.dataset.cardId;
  const card = cards.find(function (item) { return item.id === id; });
  if (!card) return;
  if (!event.target.closest('button') || operationTimer) return;
  if (event.target.hasAttribute('data-delete-card') && !window.confirm('Supprimer cette carte et sa photo ?')) return;
  beginOperation('Modification de la carte « ' + card.title + ' ».');
  try {
    if (event.target.dataset.move) {
      const direction = Number(event.target.dataset.move);
      const ordered = cards.slice().sort(function (a, b) { return Number(a.order || 0) - Number(b.order || 0); });
      const currentIndex = ordered.findIndex(function (item) { return item.id === id; });
      const targetIndex = currentIndex + direction;
      if (targetIndex < 0 || targetIndex >= ordered.length) { finishOperation('La carte est déjà à cette extrémité de la liste.'); return; }
      const other = ordered[targetIndex];
      const batch = writeBatch(db);
      batch.update(doc(db, "projectCards", id), {order:Number(other.order || targetIndex),updatedAt:serverTimestamp()});
      batch.update(doc(db, "projectCards", other.id), {order:Number(card.order || currentIndex),updatedAt:serverTimestamp()});
      logOperation('Enregistrement du nouvel ordre des cartes dans Firestore…');
      await batch.commit();
      finishOperation('Nouvel ordre confirmé par Firestore.');
      return;
    }
    if (event.target.hasAttribute("data-delete-card")) {
      logOperation('Suppression de la carte dans Firestore…');
      await deleteDoc(doc(db, "projectCards", id));
      logOperation('Suppression de la carte confirmée par Firestore.');
      const cleaned = await removeStoredImage(card.storagePath);
      finishOperation(cleaned ? 'Carte et photo supprimées.' : 'Carte supprimée ; nettoyage de la photo à vérifier dans Cloudinary.', cleaned ? 'success' : 'warning');
      return;
    }
    if (event.target.hasAttribute("data-save-card")) {
      event.target.disabled = true;
      const read = function (name) { return article.querySelector('[data-field="' + name + '"]'); };
      const update = {
        title:read("title").value.trim(),category:read("category").value,description:read("description").value.trim(),order:Number(read("order").value || 0),visible:read("visible").checked,updatedAt:serverTimestamp()
      };
      const file = read("image").files[0];
      let uploaded = null;
      if (file) {
        uploaded = await uploadImage(file);
        update.imageUrl = uploaded.imageUrl;
        update.storagePath = uploaded.storagePath;
      }
      try {
        logOperation('Enregistrement des modifications dans Firestore…');
        await updateDoc(doc(db, "projectCards", id), update);
      } catch (error) {
        if (uploaded) await removeStoredImage(uploaded.storagePath);
        throw error;
      }
      logOperation('Modifications confirmées par Firestore.');
      const cleaned = file ? await removeStoredImage(card.storagePath) : true;
      event.target.disabled = false;
      setSync("Carte enregistrée");
      finishOperation(cleaned ? 'Carte enregistrée.' : 'Carte enregistrée ; ancienne photo à vérifier dans Cloudinary.', cleaned ? 'success' : 'warning');
    }
  } catch (error) {
    console.error(error);
    setSync(error.message || "Modification impossible");
    finishOperation(operationError(error), 'error');
    if (event.target) event.target.disabled = false;
  }
});
