// Default Sample Products
const defaultProducts = [
    { id: 1, name: "iPhone 15 Pro Max 256GB Natural Titanium", price: 4199, media: ["https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?q=80&w=400"], video: "" },
    { id: 2, name: "Sony PlayStation 5 Slim Digital Edition", price: 1649, media: ["https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=400"], video: "" }
];

let products = JSON.parse(localStorage.getItem('noon_products')) || defaultProducts;
let cartCount = 0;

// Helper function to fix Google Drive Links automatically
function fixDriveLink(url) {
    if (url.includes('drive.google.com')) {
        let fileId = '';
        if (url.includes('/d/')) {
            fileId = url.split('/d/')[1].split('/')[0];
        } else if (url.includes('id=')) {
            fileId = url.split('id=')[1].split('&')[0];
        }
        return fileId ? `https://drive.google.com/uc?export=view&id=${fileId}` : url;
    }
    if (url.includes('youtube.com/watch?v=')) {
        let vidId = url.split('v=')[1].split('&')[0];
        return `https://www.youtube.com/embed/${vidId}`;
    }
    return url;
}

// Track active slide index for each product card
let activeSlides = {};

function renderProducts() {
    const productsGrid = document.getElementById('productsGrid');
    productsGrid.innerHTML = '';
    
    products.forEach((product, pIndex) => {
        // Prepare all viewable media items (Images + Video if exists)
        let items = [...product.media];
        if (product.video) {
            items.push({ type: 'video', url: fixDriveLink(product.video) });
        }
        
        if (!activeSlides[product.id]) activeSlides[product.id] = 0;
        let currentIdx = activeSlides[product.id];
        
        let mediaHtml = '';
        let currentItem = items[currentIdx];
        
        if (currentItem) {
            if (typeof currentItem === 'object' && currentItem.type === 'video') {
                if (currentItem.url.includes('youtube.com/embed')) {
                    mediaHtml = `<iframe src="${currentItem.url}" frameborder="0" allowfullscreen></iframe>`;
                } else {
                    mediaHtml = `<video src="${currentItem.url}" controls></video>`;
                }
            } else {
                mediaHtml = `<img src="${fixDriveLink(currentItem)}" alt="${product.name}">`;
            }
        }

        // Show buttons only if there are multiple items
        let controlsHtml = '';
        if (items.length > 1) {
            controlsHtml = `
                <button class="slider-btn prev-btn" onclick="changeSlide(${product.id}, -1)">❮</button>
                <button class="slider-btn next-btn" onclick="changeSlide(${product.id}, 1)">❯</button>
            `;
        }

        productsGrid.innerHTML += `
            <div class="product-card">
                <div class="media-container" id="media-${product.id}">
                    ${controlsHtml}
                    ${mediaHtml}
                </div>
                <h3>${product.name}</h3>
                <div class="price">AED ${product.price}</div>
                <button class="buy-btn" onclick="addToCart()">Add To Cart</button>
            </div>
        `;
    });
}

window.changeSlide = function(productId, direction) {
    let product = products.find(p => p.id === productId);
    let items = [...product.media];
    if (product.video) items.push({ type: 'video', url: fixDriveLink(product.video) });
    
    let currentIdx = activeSlides[productId];
    currentIdx += direction;
    
    if (currentIdx >= items.length) currentIdx = 0;
    if (currentIdx < 0) currentIdx = items.length - 1;
    
    activeSlides[productId] = currentIdx;
    renderProducts();
}

function renderAdminProducts() {
    const adminProductsList = document.getElementById('adminProductsList');
    adminProductsList.innerHTML = '';
    products.forEach(product => {
        adminProductsList.innerHTML += `
            <div class="admin-item">
                <span><strong>${product.name}</strong> - AED ${product.price} (${product.media.length} Images)</span>
                <button class="delete-btn" onclick="deleteProduct(${product.id})">Delete</button>
            </div>
        `;
    });
}

function addToCart() {
    cartCount++;
    document.getElementById('cartCount').innerText = cartCount;
    alert("Product added to cart! Delivery to Dubai/Abu Dhabi within 24 hours.");
}

// Admin Panel UI Toggles
document.getElementById('adminBtn').addEventListener('click', () => document.getElementById('loginModal').classList.remove('hidden'));
document.getElementById('loginClose').addEventListener('click', () => {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('adminPassword').value = '';
});

document.getElementById('loginSubmit').addEventListener('click', () => {
    if (document.getElementById('adminPassword').value === '202612570') {
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('customerView').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
        document.getElementById('adminBtn').classList.add('hidden');
        renderAdminProducts();
    } else {
        alert("Wrong Admin Password!");
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    document.getElementById('adminPanel').classList.add('hidden');
    document.getElementById('customerView').classList.remove('hidden');
    document.getElementById('adminBtn').classList.remove('hidden');
    document.getElementById('adminPassword').value = '';
});

// Form Submit
document.getElementById('addProductForm').addEventListener('submit', (e) => {
    e.preventDefault();
    let imgInput = document.getElementById('prodImages').value;
    // Split lines or commas to support multiple images
    let imgArray = imgInput.split(',').map(item => item.trim()).filter(item => item !== '');

    const newProduct = {
        id: Date.now(),
        name: document.getElementById('prodName').value,
        price: Number(document.getElementById('prodPrice').value),
        media: imgArray,
        video: document.getElementById('prodVideo').value.trim()
    };
    
    products.push(newProduct);
    localStorage.setItem('noon_products', JSON.stringify(products));
    document.getElementById('addProductForm').reset();
    renderAdminProducts();
    renderProducts();
    alert("Product Uploaded with Multi-Media Support!");
});

window.deleteProduct = function(id) {
    if (confirm("Are you sure?")) {
        products = products.filter(p => p.id !== id);
        localStorage.setItem('noon_products', JSON.stringify(products));
        renderAdminProducts();
        renderProducts();
    }
}

renderProducts();
