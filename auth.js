// auth.js
// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    // Initialisation Supabase
    const SUPABASE_URL = "https://ufpmrteapbfukhftrpcv.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcG1ydGVhcGJmdWtoZnRycGN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1Njc2OTcsImV4cCI6MjA2MTE0MzY5N30.GdoHerSP1ij8_m9L9562n5FXvHR7V6J-dxHc-70oPUs";
    
    // Créer le client Supabase
    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Gestion du formulaire
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async function(e) {
            e.preventDefault();
    
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const loginBtn = document.getElementById("loginBtn");
    const btnText = document.getElementById("btnText");
    const spinner = document.getElementById("spinner");

    // Validation basique
    if (!email || !password) {
        showError("Veuillez remplir tous les champs");
        return;
    }

    // UI loading state
    btnText.textContent = "Connexion en cours...";
    spinner.style.display = "inline-block";
    loginBtn.disabled = true;

    try {
        // Tentative de connexion
        const { data, error } = await supabase.auth.signInWithPassword({ 
            email, 
            password 
        });

        if (error) {
            throw error;
        }

        // Vérification de l'utilisateur
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) throw new Error("Aucun utilisateur trouvé après connexion");

        // Redirection si succès
        window.location.href = "./home.html";
        
    } catch (error) {
        console.error("Erreur de connexion:", error);
        
        // Messages d'erreur plus précis
        let errorMessage = "Erreur de connexion";
        if (error.message.includes("Invalid login credentials")) {
            errorMessage = "Email ou mot de passe incorrect";
        } else if (error.message.includes("Email not confirmed")) {
            errorMessage = "Veuillez confirmer votre email avant de vous connecter";
        }
        
        showError(errorMessage);
    } finally {
        // Réinitialisation de l'UI
        btnText.textContent = "Se connecter";
        spinner.style.display = "none";
        loginBtn.disabled = false;
    }
});

// Fonction pour afficher les erreurs
function showError(message) {
    // Supprime les anciens messages d'erreur
    const existingError = document.querySelector(".error-message");
    if (existingError) existingError.remove();
    
    // Crée un nouvel élément d'erreur
    const errorElement = document.createElement("div");
    errorElement.className = "error-message";
    errorElement.style.color = "var(--accent-color)";
    errorElement.style.marginTop = "10px";
    errorElement.style.textAlign = "center";
    errorElement.textContent = message;
    
    // Ajoute le message après le formulaire
    const form = document.getElementById("loginForm");
    form.appendChild(errorElement);
}

// Vérification de session au chargement
supabase.auth.getSession()
    .then(({ data: { session } }) => {
        if (session?.user) {
            window.location.href = "./home.html";
        }
    })
    .catch(error => {
        console.error("Erreur vérification session:", error);
    });
    // ... [le reste de votre code JavaScript]
});
