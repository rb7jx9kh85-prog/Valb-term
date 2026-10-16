import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { db, firebaseConfigured } from "./firebase-client.js";

const form = document.querySelector("#quote-form");
const status = document.querySelector("#form-status");
const clean = function (value) { return String(value || "").trim(); };

function emailFallback(data) {
  const subject = encodeURIComponent("Demande de devis VALB-THERM — " + data.service);
  const body = encodeURIComponent("Nom : " + data.name + "\nTéléphone : " + data.phone + "\nE-mail : " + data.email + "\nDomaine : " + data.service + "\nProjet : " + data.project + "\n\n" + data.message);
  return "mailto:info@valb-therm.ch?subject=" + subject + "&body=" + body;
}

if (form) form.addEventListener("submit", async function (event) {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const raw = Object.fromEntries(new FormData(form));
  const request = {
    name: clean(raw.name).slice(0, 120),
    phone: clean(raw.phone).slice(0, 40),
    email: clean(raw.email).slice(0, 160).toLowerCase(),
    service: clean(raw.service).slice(0, 100),
    project: clean(raw.project).slice(0, 100),
    message: clean(raw.message).slice(0, 3000),
    status: "Nouveau",
    meeting: null,
    source: "site-web",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  status.textContent = "Envoi en cours…";
  try {
    if (!firebaseConfigured || !db) throw new Error("firebase-not-configured");
    await addDoc(collection(db, "requests"), request);
    form.reset();
    status.textContent = "Votre demande a bien été envoyée. Nous vous recontactons rapidement.";
  } catch (error) {
    console.error("Envoi Firebase impossible", error);
    status.textContent = "L’envoi n’a pas abouti. Votre message est toujours dans le formulaire. ";
    const fallback = document.createElement("a");
    fallback.href = emailFallback(request);
    fallback.textContent = "Envoyer par e-mail à la place";
    status.append(fallback);
  } finally {
    if (submit) submit.disabled = false;
  }
});
