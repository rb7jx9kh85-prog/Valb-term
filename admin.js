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
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";
import { auth, db, storage, firebaseConfigured } from "./firebase-client.js";

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
function validateImage(file) {
  if (!file) throw new Error("Choisissez une image.");
  if (!["image/jpeg","image/png","image/webp"].includes(file.type)) throw new Error("Utilisez une image JPG, PNG ou WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("L’image dépasse la limite de 5 Mo.");
}
function imagePath(file) {
  const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  return "project-cards/" + crypto.randomUUID() + "." + extension;
}
async function uploadImage(file) {
  validateImage(file);
  const path = imagePath(file);
  const imageReference = ref(storage, path);
  await uploadBytes(imageReference, file, {contentType:file.type});
  return {imageUrl:await getDownloadURL(imageReference),storagePath:path};
}
async function removeStoredImage(path) {
  if (!path) return;
  try { await deleteObject(ref(storage, path)); } catch (error) { console.warn("Image déjà absente", error); }
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
  const submit = cardForm.querySelector('button[type="submit"]');
  const data = new FormData(cardForm);
  submit.disabled = true;
  cardFormStatus.textContent = "Importation de l’image…";
  let uploaded = null;
  try {
    uploaded = await uploadImage(data.get("image"));
    await addDoc(collection(db, "projectCards"), {
      title:String(data.get("title")).trim(),category:String(data.get("category")),description:String(data.get("description")).trim(),order:Number(data.get("order") || 0),visible:data.get("visible") === "on",imageUrl:uploaded.imageUrl,storagePath:uploaded.storagePath,createdAt:serverTimestamp(),updatedAt:serverTimestamp()
    });
    cardForm.reset();
    cardForm.querySelector('[name="visible"]').checked = true;
    cardFormStatus.textContent = "La carte est publiée.";
  } catch (error) {
    console.error(error);
    if (uploaded) await removeStoredImage(uploaded.storagePath);
    cardFormStatus.textContent = error.message || "Importation impossible.";
  } finally { submit.disabled = false; }
});

cardList.addEventListener("click", async function (event) {
  const article = event.target.closest("[data-card-id]");
  if (!article) return;
  const id = article.dataset.cardId;
  const card = cards.find(function (item) { return item.id === id; });
  if (!card) return;
  try {
    if (event.target.dataset.move) {
      const direction = Number(event.target.dataset.move);
      const ordered = cards.slice().sort(function (a, b) { return Number(a.order || 0) - Number(b.order || 0); });
      const currentIndex = ordered.findIndex(function (item) { return item.id === id; });
      const targetIndex = currentIndex + direction;
      if (targetIndex < 0 || targetIndex >= ordered.length) return;
      const other = ordered[targetIndex];
      const batch = writeBatch(db);
      batch.update(doc(db, "projectCards", id), {order:Number(other.order || targetIndex),updatedAt:serverTimestamp()});
      batch.update(doc(db, "projectCards", other.id), {order:Number(card.order || currentIndex),updatedAt:serverTimestamp()});
      await batch.commit();
      return;
    }
    if (event.target.hasAttribute("data-delete-card")) {
      if (!window.confirm("Supprimer cette carte et sa photo ?")) return;
      await deleteDoc(doc(db, "projectCards", id));
      await removeStoredImage(card.storagePath);
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
        await updateDoc(doc(db, "projectCards", id), update);
      } catch (error) {
        if (uploaded) await removeStoredImage(uploaded.storagePath);
        throw error;
      }
      if (file) await removeStoredImage(card.storagePath);
      event.target.disabled = false;
      setSync("Carte enregistrée");
    }
  } catch (error) {
    console.error(error);
    setSync(error.message || "Modification impossible");
    if (event.target) event.target.disabled = false;
  }
});
