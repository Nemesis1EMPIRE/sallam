import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
  
  // Initialize Supabase
  const supabase = createClient(
    'https://ufpmrteapbfukhftrpcv.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcG1ydGVhcGJmdWtoZnRycGN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1Njc2OTcsImV4cCI6MjA2MTE0MzY5N30.GdoHerSP1ij8_m9L9562n5FXvHR7V6J-dxHc-70oPUs'
  )

  // Variables globales
  let timeoutSearch;
  let lazyImageObserver;

  // Fonction pour initialiser l'Intersection Observer
  const initLazyLoading = () => {
    if ('IntersectionObserver' in window) {
      lazyImageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            img.loading = 'eager';
            lazyImageObserver.unobserve(img);
          }
        });
      }, {
        rootMargin: '200px 0px' // Charge les images 200px avant qu'elles entrent dans le viewport
      });
    }
  };

  // Fonction de recherche optimisée avec debounce
  const rechercherArticles = async () => {
    const searchTerm = document.getElementById('searchInput').value.trim();
    const productList = document.getElementById('productList');
    
    // Afficher le loader pendant la recherche
    productList.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
      </div>
    `;
    
    try {
      let query = supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(
          `titre.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,categorie.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      productList.innerHTML = '';

      if (data.length === 0) {
        productList.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
            <i class="fas fa-search" style="font-size: 50px; color: #ddd;"></i>
            <p>${searchTerm ? `Aucun résultat pour "${searchTerm}"` : 'Aucun article disponible'}</p>
          </div>
        `;
        return;
      }

      data.forEach(afficherArticle);

      // Observer les nouvelles images
      document.querySelectorAll('.product-image[data-src]').forEach(img => {
        if (lazyImageObserver) {
          lazyImageObserver.observe(img);
        } else {
          // Fallback si IntersectionObserver n'est pas supporté
          img.src = img.dataset.src;
        }
      });

    } catch (error) {
      console.error("Erreur de recherche:", error);
      productList.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #dc3545;">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Erreur lors de la recherche</p>
        </div>
      `;
    }
  };

  // Fonction pour ouvrir le modal
  const openModal = async (e) => {
    if (e) e.preventDefault();
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        alert("Veuillez vous connecter pour ajouter un article");
        window.location.href = "login.html";
        return;
      }
      
      document.getElementById('overlay').style.display = 'flex';
      document.body.style.overflow = 'hidden';
    } catch (error) {
      console.error("Error opening modal:", error);
    }
  };
  
  // Fonction pour fermer le modal
  const closeModal = (e) => {
    if (e) e.preventDefault();
    document.getElementById('overlay').style.display = 'none';
    document.body.style.overflow = 'auto';
  };


  // Fonction pour ajouter un article
  const ajouterArticle = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        alert("Session expirée. Veuillez vous reconnecter.");
        window.location.href = "login.html";
        return;
      }

      // Validation des champs
      const titre = document.getElementById('titre').value.trim();
      const prix = parseFloat(document.getElementById('prix').value);
      const description = document.getElementById('description').value.trim();
      const imageFile = document.getElementById('image').files[0];
      const categorie = document.getElementById('categorie').value;

      if (!titre || isNaN(prix) || !description || !imageFile || !categorie) {
        alert("Veuillez remplir tous les champs correctement.");
        return;
      }

      // Mise à jour UI
      const submitBtn = document.getElementById('submitArticleBtn');
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publication...';
      submitBtn.disabled = true;

      // Compression de l'im

    // 1. Upload image
    const { error: uploadError } = await supabase.storage
      .from('article-images')
      .upload(filePath, compressedImage, {
        cacheControl: '3600',
        upsert: false,
        contentType: compressedImage.type
      });
    
    if (uploadError) throw uploadError;
    
    // 2. Obtenir l'URL publique
    const { data: publicUrlData } = supabase.storage
      .from('article-images')
      .getPublicUrl(filePath);
    
    const publicUrl = publicUrlData.publicUrl;

    
      // Récupération de l'URL optimisée
      const { data: { publicUrl } } = supabase.storage
        .from('article-images')
        .getPublicUrl(filePath, {
          transform: {
            width: 800,
            height: 600,
            quality: 80,
            format: 'auto'
          }
        });

      // Insertion avec user_id
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
        .select();

      if (insertError) throw insertError;

      // Succès
      afficherArticle(article[0]);
      closeModal();
      
      // Message succès
      const successMsg = document.createElement('div');
      successMsg.innerHTML = `
        <div style="position: fixed; bottom: 20px; right: 20px; 
                 background: var(--success-color); color: white; 
                 padding: 15px; border-radius: var(--border-radius); 
                 box-shadow: var(--box-shadow); z-index: 1000;">
          <i class="fas fa-check-circle"></i> Article publié !
        </div>
      `;
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);

      // Recharger les articles
      await rechercherArticles();

    } catch (error) {
      console.error("Erreur:", error);
      alert(`Erreur: ${error.message}`);
    } finally {
      const submitBtn = document.getElementById('submitArticleBtn');
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Publier';
        submitBtn.disabled = false;
      }
    }
  };
  
 // Fonction pour obtenir l'URL correcte de l'image
  const getCorrectImageUrl = (url) => {
    // Si l'URL est déjà une URL complète, la retourner telle quelle
    if (url.startsWith('http')) {
      return url;
    }
    
    // Si c'est un chemin Supabase, construire l'URL complète
    if (url.startsWith('article-images/')) {
      const { data: { publicUrl } } = supabase.storage
        .from('article-images')
        .getPublicUrl(url);
      return publicUrl;
    }
    
    // Retourner l'URL d'origine si on ne sait pas comment la traiter
    return url;
  };

  // Fonction d'affichage d'un article corrigée
  const afficherArticle = (article) => {
    const container = document.getElementById('productList');
    const div = document.createElement('div');
    div.className = 'product';
    
    // Obtenir l'URL correcte de l'image
    const imageUrl = getCorrectImageUrl(article.image_url);
    
    div.innerHTML = `
      <div class="product-image-container">
        <div class="image-placeholder">
          <i class="fas fa-image"></i>
        </div>
       <img class="product-image" data-src="${image_url}" alt="${titre}"
             loading="lazy" decoding="async"
             onload="this.classList.add('loaded'); this.previousElementSibling.style.display='none'"
             onerror="this.onerror=null; this.previousElementSibling.style.display='flex'; console.error('Erreur de chargement de l\'image:', this.src)">
      </div>
      <div class="product-info">
        <h3 class="product-title">${article.titre}</h3>
        <p class="product-description">${article.description}</p>
        <span class="product-category">${article.categorie}</span>
        <p class="product-price">${article.prix.toLocaleString()} FCFA</p>
        <button class="contact-btn">
          <i class="fas fa-envelope"></i> Contacter
        </button>
      </div>
    `;
    container.prepend(div);
  };

    
    // Observer l'image si elle utilise le lazy loading
    const img = div.querySelector('.product-image');
    if (img.hasAttribute('data-src') && lazyImageObserver) {
      lazyImageObserver.observe(img);
    }
  };

  // Initialisation
  document.addEventListener('DOMContentLoaded', () => {
    // Initialiser le lazy loading
    initLazyLoading();

    // Écouteur recherche avec debounce
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
      clearTimeout(timeoutSearch);
      timeoutSearch = setTimeout(() => {
        rechercherArticles().catch(console.error);
      }, 300);
    });

    // Autres écouteurs
    document.getElementById('addProductBtn')?.addEventListener('click', openModal);
    document.getElementById('submitArticleBtn')?.addEventListener('click', ajouterArticle);
    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
    document.getElementById('cancelModalBtn')?.addEventListener('click', closeModal);
    
    document.getElementById('fileUploadBtn')?.addEventListener('click', () => {
      document.getElementById('image').click();
    });
    
    document.getElementById('image')?.addEventListener('change', function(e) {
      const fileName = document.getElementById('fileName');
      fileName.textContent = this.files[0]?.name || '';
    });

    // Chargement initial
    rechercherArticles().catch(console.error);
  });
