function showError(message, formId = "loginForm") {
    const existingError = document.querySelector(".error-message");
    if (existingError) existingError.remove();

    const errorElement = document.createElement("div");
    errorElement.className = "error-message";
    errorElement.style.cssText = "color:var(--accent-color);margin-top:10px;text-align:center";
    errorElement.textContent = message;

    const form = document.getElementById(formId);
    if (form) form.appendChild(errorElement);
}

function showSuccess(message, formId) {
    const el = document.createElement("div");
    el.className = "error-message";
    el.style.cssText = "color:green;margin-top:10px;text-align:center";
    el.textContent = message;
    const form = document.getElementById(formId);
    if (form) form.appendChild(el);
}

document.addEventListener('DOMContentLoaded', function () {

    // ✅ URL sans /rest/v1/
    const SUPABASE_URL = "https://zdwcvquucromiyixvfzg.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkd2N2cXV1Y3JvbWl5aXh2ZnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODc2OTcsImV4cCI6MjA5MjI2MzY5N30.4Gpie4IQPSGapjC-AgkTAFMRrHfLNhxnF8YxNZq_crk";

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ─── CONNEXION ───────────────────────────────────────────
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const email    = document.getElementById("email")?.value.trim();
            const password = document.getElementById("password")?.value;
            const loginBtn = document.getElementById("loginBtn");
            const btnText  = document.getElementById("btnText");
            const spinner  = document.getElementById("spinner");

            if (!email || !password) {
                showError("Veuillez remplir tous les champs");
                return;
            }

            if (btnText) btnText.textContent = "Connexion en cours...";
            if (spinner) spinner.style.display = "inline-block";
            if (loginBtn) loginBtn.disabled = true;

            try {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;

                window.location.href = "./index.html";

            } catch (error) {
                let msg = "Erreur de connexion";
                if (error.message.includes("Invalid login credentials"))
                    msg = "Email ou mot de passe incorrect";
                else if (error.message.includes("Email not confirmed"))
                    msg = "Veuillez confirmer votre email";
                showError(msg);
            } finally {
                if (btnText) btnText.textContent = "Se connecter";
                if (spinner) spinner.style.display = "none";
                if (loginBtn) loginBtn.disabled = false;
            }
        });
    }

    // ─── INSCRIPTION ─────────────────────────────────────────
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const nom      = document.getElementById("nom")?.value.trim();
            const email    = document.getElementById("reg-email")?.value.trim();
            const password = document.getElementById("reg-password")?.value;
            const confirm  = document.getElementById("reg-confirm")?.value;
            const regBtn   = document.getElementById("registerBtn");
            const btnText  = document.getElementById("regBtnText");
            const spinner  = document.getElementById("regSpinner");

            if (!nom || !email || !password || !confirm) {
                showError("Veuillez remplir tous les champs", "registerForm");
                return;
            }
            if (password !== confirm) {
                showError("Les mots de passe ne correspondent pas", "registerForm");
                return;
            }
            if (password.length < 6) {
                showError("Le mot de passe doit contenir au moins 6 caractères", "registerForm");
                return;
            }

            if (btnText) btnText.textContent = "Inscription en cours...";
            if (spinner) spinner.style.display = "inline-block";
            if (regBtn)  regBtn.disabled = true;

            try {
                // Créer le compte auth
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { nom } }   // metadata user
                });
                if (error) throw error;

                // Insérer le profil dans la table users
                if (data.user) {
                    const { error: profileError } = await supabase
                        .from("users")
                        .insert([{
                            id:         data.user.id,
                            nom,
                            email,
                            created_at: new Date().toISOString()
                        }]);
                    if (profileError) throw profileError;
                }

                showSuccess("Compte créé ! Vérifiez votre email pour confirmer.", "registerForm");

            } catch (error) {
                let msg = "Erreur lors de l'inscription";
                if (error.message.includes("already registered"))
                    msg = "Cet email est déjà utilisé";
                showError(msg, "registerForm");
            } finally {
                if (btnText) btnText.textContent = "S'inscrire";
                if (spinner) spinner.style.display = "none";
                if (regBtn)  regBtn.disabled = false;
            }
        });
    }

    // ─── SESSION EXISTANTE ────────────────────────────────────
    supabase.auth.getSession()
        .then(({ data: { session } }) => {
            if (session?.user) window.location.href = "./index.html";
        })
        .catch(console.error);
});
