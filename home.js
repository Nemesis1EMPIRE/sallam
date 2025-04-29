import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
  
  // Initialize Supabase
  const supabase = createClient(
    'https://ufpmrteapbfukhftrpcv.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcG1ydGVhcGJmdWtoZnRycGN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1Njc2OTcsImV4cCI6MjA2MTE0MzY5N30.GdoHerSP1ij8_m9L9562n5FXvHR7V6J-dxHc-70oPUs'
  )

  // Fonction pour ouvrir le modal (simplifiée)
  const openModal = async (e) => {
    if (e) e.preventDefault();
    
    try {
      // Vérifie seulement si l'utilisateur est connecté
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        alert("Veuillez vous connecter pour ajouter un article")
        window.location.href = "login.html"
        return
      }
      
      // Affiche directement le modal d'ajout
      document.getElementById('overlay').style.display = 'flex'
      document.body.style.overflow = 'hidden'
    } catch (error) {
      console.error("Error opening modal:", error)
    }
  }
  
  // Fonction pour fermer le modal
  const closeModal = (e) => {
    if (e) e.preventDefault();
    document.getElementById('overlay').style.display = 'none'
    document.body.style.overflow = 'auto'
  }

  // Fonction pour ajouter un article (simplifiée)
  const ajouterArticle = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Récupération des valeurs du formulaire
    const titre = document.getElementById('titre').value.trim()
    const prix = parseFloat(document.getElementById('prix').value)
    const description = document.getElementById('description').value.trim()
    const imageFile = document.getElementById('image').files[0]
    const categorie = document.getElementById('categorie').value

    // Validation des champs
    if (!titre) {
      alert('Veuillez saisir un titre')
      return false
    }
    if (isNaN(prix) || prix <= 0) {
      alert('Veuillez saisir un prix valide')
      return false
    }
    if (!description || description.length < 10) {
      alert('Description trop courte (min 10 caractères)')
      return false
    }
    if (!imageFile) {
      alert('Veuillez sélectionner une image')
      return false
    }
    if (!categorie) {
      alert('Veuillez sélectionner une catégorie')
      return false
    }

    try {
      // Vérification connexion
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        alert("Session expirée. Veuillez vous reconnecter.")
        window.location.href = "login.html"
        return false
      }

      // Mise à jour UI
      const submitBtn = document.getElementById('submitArticleBtn')
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publication...'
      submitBtn.disabled = true

      // Upload image
      const fileExt = imageFile.name.split('.').pop()
      const filePath = `articles/${user.id}-${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(filePath, imageFile)

      if (uploadError) throw uploadError

      // Récupération URL
      const { data: { publicUrl } } = supabase.storage
        .from('article-images')
        .getPublicUrl(filePath)

      // Insertion article
      const { data: article, error: insertError } = await supabase
        .from('articles')
        .insert([{
          titre,
          prix,
          description,
          image_url: publicUrl,
          categorie,
          user_id: user.id,
          created_at: new Date().toISOString()
        }])
        .select()

      if (insertError) throw insertError

      // Affichage et reset
      afficherArticle(article[0])
      closeModal()
      
      // Message succès
      const successMsg = document.createElement('div')
      successMsg.innerHTML = `
        <div style="position: fixed; bottom: 20px; right: 20px; 
                   background: var(--success-color); color: white; 
                   padding: 15px; border-radius: var(--border-radius); 
                   box-shadow: var(--box-shadow); z-index: 1000;">
          <i class="fas fa-check-circle"></i> Article publié !
        </div>
      `
      document.body.appendChild(successMsg)
      setTimeout(() => successMsg.remove(), 3000)
      
      return true

    } catch (error) {
      console.error("Erreur:", error)
      alert(`Erreur: ${error.message}`)
      return false
    } finally {
      const submitBtn = document.getElementById('submitArticleBtn')
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Publier'
        submitBtn.disabled = false
      }
    }
  }

  // Fonctions d'affichage (inchangées)
  const chargerArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false })
      
      const productList = document.getElementById('productList')
      productList.innerHTML = data?.length ? '' : `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
          <i class="fas fa-box-open" style="font-size: 50px; color: #ddd;"></i>
          <p>Aucun article disponible</p>
        </div>
      `
      
      data?.forEach(afficherArticle)
    } catch (error) {
      console.error('Error loading articles:', error)
    }
  }

  const afficherArticle = (article) => {
    const container = document.getElementById('productList')
    const div = document.createElement('div')
    div.className = 'product'
    div.innerHTML = `
      <img src="${article.image_url}" alt="${article.titre}" class="product-image">
      <div class="product-info">
        <h3 class="product-title">${article.titre}</h3>
        <p class="product-description">${article.description}</p>
        <span class="product-category">${article.categorie}</span>
        <p class="product-price">${article.prix.toLocaleString()} FCFA</p>
        <button class="contact-btn">
          <i class="fas fa-envelope"></i> Contacter
        </button>
      </div>
    `
    container.prepend(div)
  }

  // Initialisation
  document.addEventListener('DOMContentLoaded', () => {
    // Écouteurs d'événements
    document.getElementById('addProductBtn')?.addEventListener('click', (e) => {
      openModal(e).catch(console.error)
    })
    
    document.getElementById('submitArticleBtn')?.addEventListener('click', (e) => {
      ajouterArticle(e).catch(console.error)
    })
    
    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal)
    document.getElementById('cancelModalBtn')?.addEventListener('click', closeModal)
    
    document.getElementById('fileUploadBtn')?.addEventListener('click', () => {
      document.getElementById('image').click()
    })
    
    document.getElementById('image')?.addEventListener('change', function(e) {
      const fileName = document.getElementById('fileName')
      fileName.textContent = this.files[0]?.name || ''
    })
    
    // Chargement initial
    chargerArticles().catch(console.error)
  })
