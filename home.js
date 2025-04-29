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

  // Fonction pour compresser une image avant upload
  const compressImage = async (file) => {
    return new Promise((resolve) => {
      if (file.size < 500000) { // Ne pas compresser si < 500KB
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          }, 'image/jpeg', 0.7); // Qualité à 70%
        };
      };
    });
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

      // Compression de l'image
      const compressedImage = await compressImage(imageFile);

      // Upload de l'image
      const fileExt = compressedImage.name.split('.').pop();
      const filePath = `articles/${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(filePath, compressedImage, {
          cacheControl: '3600',
          upsert: false,
          contentType: compressedImage.type
        });
    
      if (uploadError) {
        console.error("Erreur upload:", uploadError);
        throw uploadError;
      }

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

  // Fonction d'affichage d'un article
  const afficherArticle = (article) => {
    const container = document.getElementById('productList');
    const div = document.createElement('div');
    div.className = 'product';
    
    // URL optimisée avec transformations Supabase
    const imageUrl = article.image_url.includes('/storage/v1/object/public/')
      ? article.image_url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + 
        '?width=400&height=300&quality=80'
      : article.image_url;
    
    div.innerHTML = `
      <div class="image-placeholder">
        <i class="fas fa-image" style="font-size: 24px;"></i>
      </div>
      <img data-src="${imageUrl}" alt="${article.titre}" class="product-image" 
           loading="lazy" decoding="async"
           onerror="this.onerror=null; this.parentNode.querySelector('.image-placeholder').style.display='flex'; this.style.display='none'">
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
