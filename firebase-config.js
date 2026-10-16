export const firebaseConfig = {
  apiKey: "AIzaSyAqSKnjx3qcuhNWtWAU6yrzLVmfpG7apSE",
  authDomain: "valb-therm-admin.firebaseapp.com",
  projectId: "valb-therm-admin",
  storageBucket: "valb-therm-admin.firebasestorage.app",
  messagingSenderId: "750775108021",
  appId: "1:750775108021:web:00e4edd5e72f8ab9c199fc",
  measurementId: "G-MCBXYMW394"
};

export const firebaseConfigured = !Object.values(firebaseConfig).some(function (value) {
  return String(value).startsWith("REPLACE_WITH_");
});
