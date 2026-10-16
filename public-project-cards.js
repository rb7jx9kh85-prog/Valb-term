import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { db, firebaseConfigured } from "./firebase-client.js";

const container = document.querySelector("#dynamic-project-cards");

function createCard(card, index) {
  const link = document.createElement("a");
  link.className = "expertise-row firebase-expertise-row";
  link.href = "projets.html";

  const number = document.createElement("span");
  number.className = "expertise-number";
  number.textContent = String(index + 4).padStart(2, "0");

  const copy = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = card.title;
  const description = document.createElement("p");
  description.textContent = card.description;
  const action = document.createElement("span");
  action.className = "expertise-action";
  action.textContent = "Voir les photos";
  const arrow = document.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.innerHTML = '<svg aria-hidden="true" class="ui-icon" focusable="false" viewBox="0 0 24 24"><use href="assets/icons.svg#arrow-external"></use></svg>';
  action.append(arrow);
  copy.append(title, description, action);

  const image = document.createElement("img");
  image.src = card.imageUrl;
  image.alt = card.title + " — réalisation VALB-THERM";
  image.loading = "lazy";
  image.width = 500;
  image.height = 380;

  link.append(number, copy, image);
  return link;
}

if (container && firebaseConfigured && db) {
  try {
    const snapshot = await getDocs(query(collection(db, "projectCards"), where("visible", "==", true)));
    const cards = snapshot.docs
      .map(item => item.data())
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    cards.forEach((card, index) => container.append(createCard(card, index)));
  } catch (error) {
    console.error("Impossible de charger les cartes Firebase", error);
  }
}
