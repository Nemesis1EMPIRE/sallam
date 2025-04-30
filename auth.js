// auth.js - Version corrigée

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
    if (form) {
        form.appendChild(errorElement);
    }
}

// Initialisation lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', function() {
    // Configuration Supabase
    const SUPABASE_URL = "https://ufpmrteapbfukhftrpcv.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcG1ydGVhcGJmdWtoZnRycGN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1Njc2OTcsImV4cCI6MjA2MTE0MzY5N30.GdoHerSP1ij8_m9L9562n5FXvHR7V6J-dxHc-70oPUs";
    
    // Création du client Supabase
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Gestion de la soumission du formulaire
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            
            const email = document.getElementById("email")?.value;
            const password = document.getElementById("password")?.value;
            const loginBtn = document.getElementById("loginBtn");
            const btnText = document.getElementById("btnText");
            const spinner = document.getElementById("spinner");

            // Validation
            if (!email || !password) {
                showError("Veuillez remplir tous les champs");
                return;
            }

            // État de chargement
            if (btnText) btnText.textContent = "Connexion en cours...";
            if (spinner) spinner.style.display = "inline-block";
            if (loginBtn) loginBtn.disabled = true;

            try {
                // Tentative de connexion
                const { error } = await supabase.auth.signInWithPassword({ 
                    email, 
                    password 
                });

                if (error) throw error;

                // Vérification de l'utilisateur
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError) throw userError;
                if (!user) throw new Error("Aucun utilisateur trouvé");

                // Redirection
                window.location.href = "./index.html";
                
            } catch (error) {
                console.error("Erreur de connexion:", error);
                let errorMessage = "Erreur de connexion";
                
                if (error.message.includes("Invalid login credentials")) {
                    errorMessage = "Email ou mot de passe incorrect";
                } else if (error.message.includes("Email not confirmed")) {
                    errorMessage = "Veuillez confirmer votre email";
                }
                
                showError(errorMessage);
            } finally {
                // Réinitialisation
                if (btnText) btnText.textContent = "Se connecter";
                if (spinner) spinner.style.display = "none";
                if (loginBtn) loginBtn.disabled = false;
            }
        });
    }

    // Vérification de session existante
    supabase.auth.getSession()
        .then(({ data: { session } }) => {
            if (session?.user) {
                window.location.href = "./index.html";
            }
        })
        .catch(console.error);
});
