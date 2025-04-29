  import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

  // Initialize Supabase
  console.log("Initialisation de Supabase...");
  const supabase = createClient(
    'https://ufpmrteapbfukhftrpcv.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcG1ydGVhcGJmdWtoZnRycGN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1Njc2OTcsImV4cCI6MjA2MTE0MzY5N30.GdoHerSP1ij8_m9L9562n5FXvHR7V6J-dxHc-70oPUs'
  );
 supabase.rpc('set_guest_id', { guest_id: getClientId() });  
 console.log("Supabase initialisé:", supabase);

  function getClientId() {
  let clientId = localStorage.getItem('guest_client_id');
  if (!clientId) {
    clientId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    localStorage.setItem('guest_client_id', clientId);
  }
  return clientId;
  }

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

 

  // Fonction d'affichage d'un article (version optimisée)
  const afficherArticle = (article) => {
    const container = document.getElementById('productList');
    const div = document.createElement('div');
    div.className = 'product';

    // Vérification des champs obligatoires
    if (!article || !article.id || !article.titre) {
      console.error("Article invalide:", article);
      return;
    }
  
    const container = document.getElementById('productList');
    if (!container) return;
  
    // Construction sécurisée du HTML (évite XSS)
    const div = document.createElement('div');
    div.className = 'product';
    
    const escapeHtml = (text) => text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // 1. URL optimisée avec transformations Supabase
    const imageUrl = article.image_url.startsWith('article-images/') 
      ? supabase.storage
          .from('article-images')
          .getPublicUrl(article.image_url, {
            transform: {
              width: 800,      // Taille adaptée à l'affichage
              height: 600,     // Conserve le ratio
              quality: 70,     // Bon compromis qualité/poids
              format: 'webp'   // Format moderne (30% plus léger que JPEG)
            }
          }).data.publicUrl
      : article.image_url;
  
    // 2. Structure HTML avec placeholder amélioré
    div.innerHTML = `
      <div class="product-image-container">
        <!-- Placeholder moderne avec ratio 16/9 -->
        <div class="image-placeholder" style="
          aspect-ratio: 16/9;
          background: linear-gradient(90deg, #f5f5f5 25%, #e9e9e9 50%, #f5f5f5 75%);
          background-size: 200% 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          overflow: hidden;">
          <i class="fas fa-image" style="font-size: 24px; color: #ccc;"></i>
        </div>
        
        <!-- Image avec gestion optimisée du chargement -->
        <img 
          data-src="${imageUrl}" 
          alt="${article.titre}" 
          class="product-image" 
          loading="lazy"
          decoding="async"
          style="
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0;
            transition: opacity 0.3s ease;"
          onload="
            this.style.opacity = '1';
            this.previousElementSibling.style.display = 'none';"
          onerror="
            this.onerror = null;
            this.previousElementSibling.innerHTML = '<i class=\"fas fa-exclamation-circle\"></i> Image non disponible';
            this.previousElementSibling.style.color = '#ff6b6b';">
      </div>
       <div class="product-info">
      <h3 class="product-title">${escapeHtml(article.titre)}</h3>
      <p class="product-description">${escapeHtml(article.description)}</p>
      <span class="product-category">${escapeHtml(article.categorie || 'Non catégorisé')}</span>
      <p class="product-price">${Number(article.prix || 0).toLocaleString()} FCFA</p>
      <button class="contact-btn" data-user-id="${article.user_id}" data-article-id="${article.id}">
        <i class="fas fa-envelope"></i> Contacter
      </button>
    </div>
    `;
  
    // 3. Chargement intelligent des images
    const img = div.querySelector('.product-image');
    
    // Si l'image est dans la viewport, chargez-la immédiatement
    const rect = div.getBoundingClientRect();
    if (rect.top < window.innerHeight + 100) {
      img.src = img.dataset.src;
    } 
    // Sinon, utilisez l'IntersectionObserver
    else if (lazyImageObserver) {
      lazyImageObserver.observe(img);
    }
  
    // Gestion du bouton Contact
    div.querySelector('.contact-btn').addEventListener('click', () => 
      ouvrirMessagerie(article.user_id, article.id)
    );
  
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
      // Nouvelle fonction pour ouvrir la messagerie (version pour invités)
  const ouvrirMessagerie = async (vendeurId, articleId) => {
    try {
      const isLoggedIn = (await supabase.auth.getUser()).data.user;
      let conversationId;

      if (isLoggedIn) {
        // Utilisateur connecté - logique existante
        const { data: existingConversation } = await supabase
          .from('conversations')
          .select('id')
          .or(`and(user1.eq.${isLoggedIn.id},user2.eq.${vendeurId}),and(user1.eq.${vendeurId},user2.eq.${isLoggedIn.id})`)
          .single();

        if (existingConversation) {
          conversationId = existingConversation.id;
        } else {
          const { data: newConversation } = await supabase
            .from('conversations')
            .insert([{
              user1: isLoggedIn.id,
              user2: vendeurId,
              article_id: articleId
            }])
            .select()
            .single();
          conversationId = newConversation.id;
        }
      } else {
        // Utilisateur non connecté
      const guestId = getClientId();
        const { data: newConversation } = await supabase
          .from('conversations')
          .insert([{
            guest_id: guestId,
            user2: vendeurId, // user2 est toujours le vendeur
            article_id: articleId,
            is_guest_conversation: true
          }])
          .select()
          .single();
        conversationId = newConversation.id;
      }

      window.location.href = `messages.html?conversation=${conversationId}`;

    } catch (error) {
      console.error("Erreur:", error);
      alert("Une erreur est survenue. Veuillez réessayer.");
    }
  };
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
    document.getElementById('searchInput').addEventListener('input', () => {
      clearTimeout(timeoutSearch);
      timeoutSearch = setTimeout(rechercherArticles, 300);
    });
    // Chargement initial
    rechercherArticles().catch(console.error);
  });
