// Initialize WebsimSocket for multiplayer functionality
const room = new WebsimSocket();

// Initialize canvas and state once fabric is loaded
document.addEventListener('DOMContentLoaded', () => {
  const canvas = new fabric.Canvas('drawingCanvas', {
    isDrawingMode: true,
    width: 600,
    height: 600,
  });

  // Global state
  window.state = {
    activeTab: 'create',
    activeColor: '#FF6B6B',
    activeTool: 'pencil',
    layers: [canvas],
    activeLayerIndex: 0,
    walletConnected: false,
    walletAddress: '',
    starBalance: 0,
    myNFTs: [],
    weeklyCollection: [],
    timerInterval: null,
    canvas: canvas,  // Store canvas reference in state
    creatorProfiles: [], // Store creator profiles for leaderboard
    isAdmin: false, // Flag to check if the connected wallet is admin
    adminWallet: 'stars104zwhvkrtwx8jf68k8qzu6yjhyp80zfpuvc69n' // Admin wallet address
  };

  // Setup UI components
  setupToolButtons();
  setupColorPalette();
  setupCanvasEvents(window.state); // Pass state to event setup function
  setupTabNavigation();
  setupWalletConnection();
  setupModalEvents();
  setupLayerControls();
  setupMultiplayerEvents();
  loadNFTsFromDatabase();
  loadCreatorProfiles();
  startVotingTimer();

  // Set initial brush
  updateBrush('pencil');
});

// Setup tool buttons
function setupToolButtons() {
  document.getElementById('pencilBtn').addEventListener('click', () => updateBrush('pencil'));
  document.getElementById('brushBtn').addEventListener('click', () => updateBrush('brush'));
  document.getElementById('eraserBtn').addEventListener('click', () => updateBrush('eraser'));
  document.getElementById('clearBtn').addEventListener('click', clearCanvas);
  document.getElementById('submitNFTBtn').addEventListener('click', submitNFT);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('imageUpload').click();
  });
  document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
  document.getElementById('generateAIBtn').addEventListener('click', openAIPromptModal);
}

// Setup color palette
function setupColorPalette() {
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const color = e.target.dataset.color;
      window.state.activeColor = color;

      // Update active color button
      document.querySelectorAll('.color-btn').forEach(el => {
        el.classList.remove('active');
      });
      e.target.classList.add('active');

      // Update brush color
      if (window.state.activeTool !== 'eraser') {
        window.state.canvas.freeDrawingBrush.color = color;
      }
    });
  });
}

// Update brush based on selected tool
function updateBrush(tool) {
  window.state.activeTool = tool;

  // Update active tool button
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`${tool}Btn`).classList.add('active');

  // Configure brush based on tool
  switch (tool) {
    case 'pencil':
      window.state.canvas.freeDrawingBrush = new fabric.PencilBrush(window.state.canvas);
      window.state.canvas.freeDrawingBrush.width = 5;
      window.state.canvas.freeDrawingBrush.color = window.state.activeColor;
      break;
    case 'brush':
      window.state.canvas.freeDrawingBrush = new fabric.CrayonBrush(window.state.canvas);
      window.state.canvas.freeDrawingBrush.width = 15;
      window.state.canvas.freeDrawingBrush.color = window.state.activeColor;
      break;
    case 'eraser':
      window.state.canvas.freeDrawingBrush = new fabric.EraserBrush(window.state.canvas);
      window.state.canvas.freeDrawingBrush.width = 20;
      break;
  }
}

// Custom Crayon Brush (extends PencilBrush)
fabric.CrayonBrush = fabric.util.createClass(fabric.PencilBrush, {
  type: 'crayon',

  initialize: function(canvas) {
    this.canvas = canvas;
    this.points = [];
  },

  onMouseDown: function(pointer) {
    this._resetShadow();
    this.points = [pointer];
    this._setShadow();
    this.canvas.contextTop.lineJoin = 'round';
    this.canvas.contextTop.lineCap = 'round';
    this.canvas.contextTop.strokeStyle = this.color;
    this.canvas.contextTop.lineWidth = this.width;

    this._render();
  },

  onMouseMove: function(pointer) {
    this.points.push(pointer);
    this._render();
  },

  _render: function() {
    if (this.points.length < 2) return;

    const ctx = this.canvas.contextTop;
    ctx.beginPath();

    // Draw wavy crayon-like lines
    for (let i = 1; i < this.points.length; i++) {
      const point = this.points[i];
      const prevPoint = this.points[i-1];

      // Add slight random offsets for crayon effect
      const offsetX = Math.random() * 2 - 1;
      const offsetY = Math.random() * 2 - 1;

      if (i === 1) {
        ctx.moveTo(prevPoint.x, prevPoint.y);
      }

      ctx.lineTo(point.x + offsetX, point.y + offsetY);
    }

    ctx.stroke();
  },

  _setShadow: function() {
    if (!this.shadow) return;

    const ctx = this.canvas.contextTop;
    ctx.shadowColor = this.shadow.color;
    ctx.shadowBlur = this.shadow.blur;
    ctx.shadowOffsetX = this.shadow.offsetX;
    ctx.shadowOffsetY = this.shadow.offsetY;
  },

  _resetShadow: function() {
    const ctx = this.canvas.contextTop;
    ctx.shadowColor = '';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
});

// Setup canvas events
function setupCanvasEvents(state) {
  window.addEventListener('resize', () => resizeCanvas(state));
  resizeCanvas(state);
}

function resizeCanvas(state) {
  const container = document.querySelector('.canvas-wrapper');
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  // Maintain aspect ratio
  const size = Math.min(containerWidth, containerHeight) - 20;

  state.canvas.setWidth(size);
  state.canvas.setHeight(size);
  state.canvas.renderAll();
}

// Clear canvas
function clearCanvas() {
  if (confirm('Are you sure you want to clear the canvas?')) {
    window.state.canvas.clear();
  }
}

// Setup tab navigation
function setupTabNavigation() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabId = e.target.dataset.tab;
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  window.state.activeTab = tabId;

  // Update active tab button
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');

  // Show active tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(tabId).classList.add('active');
}

// Setup wallet connection
function setupWalletConnection() {
  document.getElementById('connectWalletBtn').addEventListener('click', connectWallet);
  document.getElementById('disconnectWalletBtn').addEventListener('click', disconnectWallet);
}

async function connectWallet() {
  try {
    // Check if Keplr is installed
    if (!window.keplr) {
      alert("Please install Keplr extension");
      return;
    }

    // Request access to Stargaze chain
    await window.keplr.enable("stargaze-1");

    // Get wallet address
    const offlineSigner = window.keplr.getOfflineSigner("stargaze-1");
    const accounts = await offlineSigner.getAccounts();
    window.state.walletAddress = accounts[0].address;

    // Check if the connected wallet is admin
    window.state.isAdmin = window.state.walletAddress === window.state.adminWallet;
    console.log("Is admin:", window.state.isAdmin);

    // Update UI
    document.getElementById('walletAddress').textContent = shortenAddress(window.state.walletAddress);
    document.getElementById('connectWalletBtn').classList.add('hidden');
    document.getElementById('walletInfo').classList.remove('hidden');
    document.getElementById('disconnectWalletBtn').classList.remove('hidden');
    document.getElementById('profileSection').classList.remove('hidden');
    
    // Show or hide admin panel based on wallet address
    const adminPanelTab = document.querySelector('.tab-btn[data-tab="adminPanel"]');
    if (window.state.isAdmin) {
      adminPanelTab.classList.remove('hidden');
      document.getElementById('adminInfo').classList.remove('hidden');
    } else {
      adminPanelTab.classList.add('hidden');
    }

    // Mock star balance (in real app, this would be fetched from blockchain)
    window.state.starBalance = 250;
    document.getElementById('starBalance').textContent = `$STARS: ${window.state.starBalance}`;

    window.state.walletConnected = true;

    // Load user NFTs
    loadUserNFTs();

    // Create or update user profile
    createUserProfile();

    console.log("Wallet connected:", window.state.walletAddress);
  } catch (error) {
    console.error("Failed to connect wallet:", error);
    alert("Failed to connect wallet. Please try again.");
  }
}

function disconnectWallet() {
  window.state.walletConnected = false;
  window.state.walletAddress = '';
  window.state.starBalance = 0;
  window.state.myNFTs = [];
  window.state.isAdmin = false; // Reset admin status
  
  // Update UI
  document.getElementById('connectWalletBtn').classList.remove('hidden');
  document.getElementById('walletInfo').classList.add('hidden');
  document.getElementById('disconnectWalletBtn').classList.add('hidden');
  document.getElementById('profileSection').classList.add('hidden');
  
  // Hide admin panel tab when disconnecting
  const adminPanelTab = document.querySelector('.tab-btn[data-tab="adminPanel"]');
  adminPanelTab.classList.add('hidden');
  document.getElementById('adminInfo').classList.add('hidden');
  
  // If currently on admin panel, switch to create tab
  if (window.state.activeTab === 'adminPanel') {
    switchTab('create');
  }

}

// Create or update user profile
async function createUserProfile() {
  try {
    // Check if user profile exists in database
    const userProfiles = await room.collection('user_profile')
      .filter({ wallet_address: window.state.walletAddress })
      .getList();
    
    if (userProfiles.length === 0) {
      // Create new profile with wallet address as username
      const newProfile = await room.collection('user_profile').create({
        wallet_address: window.state.walletAddress,
        username: shortenAddress(window.state.walletAddress),
        date_joined: new Date().toISOString(),
        nfts_submitted: 0,
        votes_received: 0,
        stars_earned: 0
      });
      
      window.state.userProfile = newProfile;
      console.log("Created new user profile:", newProfile);
    } else {
      // Use existing profile
      window.state.userProfile = userProfiles[0];
      console.log("Loaded existing user profile:", window.state.userProfile);
    }
    
    // Update profile display
    updateProfileDisplay();
  } catch (error) {
    console.error("Error creating/loading user profile:", error);
  }
}

function updateProfileDisplay() {
  if (!window.state.userProfile) return;
  
  // Display wallet address as username
  document.getElementById('profileUsername').textContent = window.state.walletAddress;
  document.getElementById('profileJoined').textContent = `Joined: ${new Date(window.state.userProfile.date_joined).toLocaleDateString()}`;
  document.getElementById('profileSubmissions').textContent = window.state.userProfile.nfts_submitted;
  document.getElementById('profileVotes').textContent = window.state.userProfile.votes_received;
  document.getElementById('profileRewards').textContent = window.state.userProfile.stars_earned;
}

// Handle image upload
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    // Create a new image to handle the crossOrigin property
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = function() {
      // Draw the image to a temporary canvas to create a clean data URL
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(img, 0, 0);
      
      // Use the clean data URL to create a Fabric image
      fabric.Image.fromURL(tempCanvas.toDataURL(), function(fabricImg) {
        // Scale image to fit canvas
        const maxSize = Math.min(window.state.canvas.width, window.state.canvas.height);
        if (fabricImg.width > maxSize || fabricImg.height > maxSize) {
          const scale = maxSize / Math.max(fabricImg.width, fabricImg.height);
          fabricImg.scale(scale);
        }

        window.state.canvas.add(fabricImg);
        window.state.canvas.renderAll();
      });
    };
    img.src = event.target.result;
  };

  reader.readAsDataURL(file);
}

// AI NFT generation
function openAIPromptModal() {
  document.getElementById('aiPromptModal').classList.remove('hidden');
}

// Setup modal events
function setupModalEvents() {
  document.getElementById('cancelAIBtn').addEventListener('click', () => {
    document.getElementById('aiPromptModal').classList.add('hidden');
  });

  document.getElementById('confirmAIBtn').addEventListener('click', generateAINFT);
}

async function generateAINFT() {
  const prompt = document.getElementById('aiPrompt').value;
  if (!prompt) {
    alert('Please enter a description of your doodle');
    return;
  }

  // Show loading state
  document.getElementById('confirmAIBtn').textContent = 'Generating...';
  document.getElementById('confirmAIBtn').disabled = true;

  try {
    // In a real implementation, this would call an AI image generation service
    // For this demo, we'll simulate it with a placeholder service

    const result = await websim.imageGen({
      prompt: "A crayon child's drawing of " + prompt,
      aspect_ratio: "1:1",
    });

    if (result && result.url) {
      // Create a new image to handle the crossOrigin property
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = function() {
        // Draw the image to a temporary canvas to create a clean data URL
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);
        
        // Use the clean data URL to create a Fabric image
        fabric.Image.fromURL(tempCanvas.toDataURL(), function(fabricImg) {
          // Scale image to fit canvas
          const maxSize = Math.min(window.state.canvas.width, window.state.canvas.height);
          if (fabricImg.width > maxSize || fabricImg.height > maxSize) {
            const scale = maxSize / Math.max(fabricImg.width, fabricImg.height);
            fabricImg.scale(scale);
          }

          window.state.canvas.clear();
          window.state.canvas.add(fabricImg);
          window.state.canvas.renderAll();

          // Close modal
          document.getElementById('aiPromptModal').classList.add('hidden');
          document.getElementById('nftTitle').value = prompt;
        });
      };
      img.src = result.url;
    } else {
      throw new Error("Failed to generate image");
    }
  } catch (error) {
    console.error("AI generation error:", error);
    alert("Failed to generate AI NFT. Please try again.");
  } finally {
    // Reset button
    document.getElementById('confirmAIBtn').textContent = 'Generate';
    document.getElementById('confirmAIBtn').disabled = false;
  }
}

// Layer management
function setupLayerControls() {
  document.getElementById('addLayerBtn').addEventListener('click', addNewLayer);
}

function addNewLayer() {
  const layersList = document.getElementById('layersList');
  const layerIndex = window.state.layers.length;

  // Create new layer HTML
  const layerEl = document.createElement('div');
  layerEl.className = 'layer';
  layerEl.dataset.layer = layerIndex;
  layerEl.innerHTML = `
    <span>Layer ${layerIndex + 1}</span>
    <button class="visibility-btn">👁️</button>
  `;

  layerEl.addEventListener('click', () => {
    setActiveLayer(layerIndex);
  });

  layersList.appendChild(layerEl);

  // Add new layer to state (in a real implementation, this would create multiple canvases)
  window.state.layers.push(window.state.canvas);

  // Set as active layer
  setActiveLayer(layerIndex);
}

function setActiveLayer(index) {
  window.state.activeLayerIndex = index;

  // Update UI
  document.querySelectorAll('.layer').forEach(layer => {
    layer.classList.remove('active');
  });

  document.querySelector(`.layer[data-layer="${index}"]`).classList.add('active');
}

// Setup multiplayer events and data sync
function setupMultiplayerEvents() {
  // Handle incoming messages (votes, new NFTs, etc.)
  room.onmessage = (event) => {
    const data = event.data;
    switch (data.type) {
      case "connected":
        console.log(`Client ${data.clientId}, ${data.username} connected`);
        break;
      case "disconnected":
        console.log(`Client ${data.clientId}, ${data.username} disconnected`);
        break;
      case "vote":
        handleNFTVote(data.nftId, data.rating, data.voterId);
        break;
      default:
        console.log("Received event:", data);
    }
  };

  // Update presence for current user
  room.party.updatePresence({
    isDrawing: false,
    location: window.state.activeTab
  });

  // Subscribe to presence changes to see who's drawing or viewing the gallery
  room.party.subscribePresence((presence) => {
    console.log("Active users:", presence);
  });
}

// Load creator profiles from database
async function loadCreatorProfiles() {
  try {
    // Get all user profiles from the database
    const profiles = room.collection('user_profile').getList();
    
    if (profiles.length > 0) {
      window.state.creatorProfiles = profiles;
      updateCreatorLeaderboard();
    } else {
      console.log("No creator profiles found in database");
    }
    
    // Subscribe to profile collection changes
    room.collection('user_profile').subscribe(function(profiles) {
      window.state.creatorProfiles = profiles;
      updateCreatorLeaderboard();
    });
  } catch (error) {
    console.error("Error loading creator profiles:", error);
  }
}

// Update creator leaderboard
function updateCreatorLeaderboard() {
  const leaderboardEl = document.getElementById('creatorLeaderboard');
  if (!leaderboardEl) return;
  
  leaderboardEl.innerHTML = '';
  
  // Sort creators by votes received (descending)
  const sortedCreators = [...window.state.creatorProfiles].sort((a, b) => 
    (b.votes_received || 0) - (a.votes_received || 0)
  );
  
  // Create leaderboard cards
  sortedCreators.forEach((creator, index) => {
    const card = document.createElement('div');
    card.className = 'creator-card';
    
    // Show medal for top 3
    let rankIcon = `<div class="creator-rank">${index + 1}</div>`;
    if (index === 0) {
      rankIcon = `<div class="creator-rank medal-1">🥇</div>`;
    } else if (index === 1) {
      rankIcon = `<div class="creator-rank medal-2">🥈</div>`;
    } else if (index === 2) {
      rankIcon = `<div class="creator-rank medal-3">🥉</div>`;
    }
    
    card.innerHTML = `
      ${rankIcon}
      <div class="creator-info">
        <div class="creator-address">${creator.wallet_address || creator.username || 'Anonymous'}</div>
        <div class="creator-stats">
          <div class="creator-stat">
            NFTs: <span class="stat-highlight">${creator.nfts_submitted || 0}</span>
          </div>
          <div class="creator-stat">
            Votes: <span class="stat-highlight">${creator.votes_received || 0}</span>
          </div>
          <div class="creator-stat">
            $STARS: <span class="stat-highlight">${creator.stars_earned || 0}</span>
          </div>
        </div>
      </div>
    `;
    
    leaderboardEl.appendChild(card);
  });
  
  // Show message if no creators
  if (sortedCreators.length === 0) {
    leaderboardEl.innerHTML = '<p>No creators found yet. Be the first to submit an NFT!</p>';
  }
}

// Load NFTs from database
async function loadNFTsFromDatabase() {
  try {
    // Get all NFTs from the database
    const nfts = room.collection('nft').getList();
    
    if (nfts.length > 0) {
      window.state.weeklyCollection = nfts;
      updateWeeklyCollection();
    } else {
      console.log("No NFTs found in database, loading mock data for demo");
      loadMockData(window.state);
    }
    
    // Subscribe to NFT collection changes
    room.collection('nft').subscribe(function(nfts) {
      window.state.weeklyCollection = nfts;
      updateWeeklyCollection();
    });
    
    // Get votes
    const votes = room.collection('vote').getList();
    updateNFTVotes(votes);
    
    // Subscribe to vote collection changes
    room.collection('vote').subscribe(function(votes) {
      updateNFTVotes(votes);
      // Update creator leaderboard when votes change
      updateCreatorLeaderboard();
    });
  } catch (error) {
    console.error("Error loading NFTs:", error);
    loadMockData(window.state);
  }
}

// Update NFT votes based on votes in database
function updateNFTVotes(votes) {
  // Group votes by NFT ID
  const votesByNFT = {};
  votes.forEach(vote => {
    if (!votesByNFT[vote.nft_id]) {
      votesByNFT[vote.nft_id] = [];
    }
    votesByNFT[vote.nft_id].push(vote);
  });
  
  // Update star ratings
  for (const nftId in votesByNFT) {
    const nftVotes = votesByNFT[nftId];
    // Calculate average rating
    const totalRating = nftVotes.reduce((sum, vote) => sum + vote.rating, 0);
    const avgRating = nftVotes.length > 0 ? Math.round(totalRating / nftVotes.length) : 0;
    
    // Update NFT in collection
    const nftIndex = window.state.weeklyCollection.findIndex(nft => nft.id === nftId);
    if (nftIndex !== -1) {
      window.state.weeklyCollection[nftIndex].stars = avgRating;
      window.state.weeklyCollection[nftIndex].vote_count = nftVotes.length;
      
      // Update creator's profile if this is their NFT
      const nft = window.state.weeklyCollection[nftIndex];
      const creatorAddress = nft.creator_address;
      
      if (creatorAddress) {
        // Find creator profile
        const creatorProfile = window.state.creatorProfiles.find(
          profile => profile.wallet_address === creatorAddress
        );
        
        if (creatorProfile) {
          const totalVotes = nftVotes.length;
          const totalStars = totalRating;
          
          // Update database profile
          room.collection('user_profile').update(creatorProfile.id, {
            votes_received: totalVotes,
            stars_earned: totalStars * 5 // 5 $STARS per star rating
          }).catch(err => console.error("Error updating profile:", err));
          
          // Also update the local state if this is the current user
          if (creatorAddress === window.state.walletAddress && window.state.userProfile) {
            window.state.userProfile.votes_received = totalVotes;
            window.state.userProfile.stars_earned = totalStars * 5;
            updateProfileDisplay();
          }
        }
      }
    }
    
    // Update UI if rating elements exist
    const ratingElements = document.querySelectorAll(`.star-rating[data-nft-id="${nftId}"]`);
    ratingElements.forEach(el => {
      const stars = el.querySelectorAll('.star');
      stars.forEach((star, i) => {
        star.textContent = i < avgRating ? '★' : '☆';
        star.classList.toggle('selected', i < avgRating);
      });
      el.dataset.stars = avgRating;
    });
  }
  
  // Update leaderboard after votes are processed
  updateCreatorLeaderboard();
}

// Handle NFT vote
async function handleNFTVote(nftId, rating, voterId) {
  // Find the NFT in the collection
  const nftIndex = window.state.weeklyCollection.findIndex(nft => nft.id === nftId);
  if (nftIndex === -1) return;
  
  // Update UI
  const ratingElements = document.querySelectorAll(`.star-rating[data-nft-id="${nftId}"]`);
  ratingElements.forEach(el => {
    const stars = el.querySelectorAll('.star');
    stars.forEach((star, i) => {
      star.textContent = i < rating ? '★' : '☆';
      star.classList.toggle('selected', i < rating);
    });
    el.dataset.stars = rating;
  });
  
  // Update creator leaderboard
  updateCreatorLeaderboard();
}

// Submit NFT to weekly collection
async function submitNFT() {
  if (!window.state.walletConnected) {
    alert('Please connect your wallet first');
    return;
  }

  const title = document.getElementById('nftTitle').value;
  const description = document.getElementById('nftDescription').value;

  if (!title) {
    alert('Please give your NFT a name');
    return;
  }

  try {
    // Get canvas data URL safely using Fabric's toDataURL
    const imageDataUrl = window.state.canvas.toDataURL({
      format: 'png',
      quality: 1,
      enableRetinaScaling: true
    });
    
    // Create a blob from the data URL
    const fetchResponse = await fetch(imageDataUrl);
    const blob = await fetchResponse.blob();
    
    // Upload image to blob storage
    const imageUrl = await websim.upload(blob);
    
    // Create NFT record in database
    const newNFT = await room.collection('nft').create({
      title: title,
      description: description,
      image_url: imageUrl,
      stars: 0,
      creator_address: window.state.walletAddress,
    });
    
    console.log("NFT created:", newNFT);
    
    // Add to local state
    window.state.myNFTs.push(newNFT);
    
    // Update user profile - increment submissions count
    if (window.state.userProfile) {
      await room.collection('user_profile').update(window.state.userProfile.id, {
        nfts_submitted: (window.state.userProfile.nfts_submitted || 0) + 1
      });
      
      window.state.userProfile.nfts_submitted = (window.state.userProfile.nfts_submitted || 0) + 1;
      updateProfileDisplay();
    }
    
    // Show success message
    alert('Your NFT has been submitted to the gallery!');
    
    // Clear form
    document.getElementById('nftTitle').value = '';
    document.getElementById('nftDescription').value = '';
  } catch (error) {
    console.error("Error creating NFT:", error);
    alert("Failed to create NFT. Please try again.");
  }
}

// Create NFT card element
function createNFTCard(nft, votable) {
  const card = document.createElement('div');
  card.className = 'nft-card';
  card.dataset.id = nft.id;

  // Handle different image data formats
  const imageUrl = nft.image_url || nft.image;

  // Add admin controls only if the user is admin
  const adminControls = window.state.isAdmin ? `
    <div class="admin-controls">
      <button class="small-btn delete-btn" data-id="${nft.id}">Delete</button>
    </div>
  ` : '';

  const downloadButton = window.state.isAdmin ? 
    `<button class="small-btn download-btn" data-url="${imageUrl}">Download</button>` : 
    (nft.creator_address === window.state.walletAddress ? 
      `<button class="small-btn download-btn" data-url="${imageUrl}">Download</button>` : '');

  const html = `
    <img src="${imageUrl}" alt="${nft.title}" class="nft-image">
    <div class="nft-info">
      <div class="nft-title">${nft.title}</div>
      <div class="nft-creator">by ${nft.creator_address || nft.creator || 'Anonymous'}</div>
      <div class="nft-date">${new Date(nft.created_at || nft.dateCreated).toLocaleDateString()}</div>
      <div class="star-rating" data-nft-id="${nft.id}" data-stars="${nft.stars || 0}">
        ${createStarRating(nft.stars || 0, votable)}
      </div>
      ${downloadButton}
      ${adminControls}
    </div>
  `;

  card.innerHTML = html;

  // Add event listener for download button
  const downloadBtn = card.querySelector('.download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Only allow admin or NFT creator to download
      if (window.state.isAdmin || nft.creator_address === window.state.walletAddress) {
        const url = e.target.dataset.url;
        const a = document.createElement('a');
        a.href = url;
        a.download = `${nft.title}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert('Only the NFT creator or admin can download this image');
      }
    });
  }

  // Add event listener for delete button (admin only)
  const deleteBtn = card.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (window.state.isAdmin) {
        if (confirm('Are you sure you want to delete this NFT?')) {
          const nftId = e.target.dataset.id;
          try {
            // Delete the NFT from the database
            await room.collection('nft').delete(nftId);
            console.log("NFT deleted:", nftId);
            
            // Remove from local state
            window.state.weeklyCollection = window.state.weeklyCollection.filter(n => n.id !== nftId);
            
            // Remove from UI
            card.remove();
            
            alert('NFT deleted successfully');
          } catch (error) {
            console.error("Error deleting NFT:", error);
            alert("Failed to delete NFT. Please try again.");
          }
        }
      } else {
        alert('Only admin can delete NFTs');
      }
    });
  }

  // Add event listeners for star rating if votable
  if (votable) {
    const starContainer = card.querySelector('.star-rating');
    const stars = starContainer.querySelectorAll('.star');

    stars.forEach((star, index) => {
      star.addEventListener('click', async () => {
        if (!window.state.walletConnected) {
          alert('Please connect your wallet to vote');
          return;
        }

        // Check if user is voting for their own NFT
        if (nft.creator_address === window.state.walletAddress) {
          alert('You cannot vote for your own NFT');
          return;
        }

        const nftId = starContainer.dataset.nftId;
        const rating = index + 1;
        
        try {
          // Create vote in database
          const vote = await room.collection('vote').create({
            nft_id: nftId,
            rating: rating
          });
          
          console.log("Vote recorded:", vote);
          
          // Send event to update other users in real-time
          room.send({
            type: "vote",
            nftId: nftId,
            rating: rating,
            voterId: room.party.client.id
          });
          
          // Update UI
          stars.forEach((s, i) => {
            s.textContent = i < rating ? '★' : '☆';
            s.classList.toggle('selected', i < rating);

            // Add pulse animation to selected star
            if (i === index) {
              s.classList.add('pulse');
              setTimeout(() => {
                s.classList.remove('pulse');
              }, 500);
            }
          });
        } catch (error) {
          console.error("Error voting:", error);
          alert("Failed to record your vote. Please try again.");
        }
      });
    });
  }

  return card;
}

// Create star rating HTML
function createStarRating(rating, votable) {
  let html = '';
  for (let i = 0; i < 5; i++) {
    const star = i < rating ? '★' : '☆';
    const selectedClass = i < rating ? 'selected' : '';
    html += `<span class="star ${selectedClass}" data-rating="${i+1}">${star}</span>`;
  }
  return html;
}

// Update weekly collection UI
function updateWeeklyCollection() {
  const container = document.getElementById('weeklyNFTs');
  container.innerHTML = '';

  window.state.weeklyCollection.forEach(nft => {
    const nftCard = createNFTCard(nft, true);
    container.appendChild(nftCard);
  });
}

// Load user NFTs
function loadUserNFTs() {
  // In a real implementation, this would fetch the user's NFTs from Stargaze
  // For this demo, we'll create some mock data
  if (window.state.myNFTs.length === 0) {
    window.state.myNFTs = [
      {
        id: '101',
        title: 'My First Doodle',
        description: 'Just trying out this cool app',
        image: createMockNFTImage('#9D65C9', 'MFD'),
        creator: window.state.walletAddress,
        creatorShort: shortenAddress(window.state.walletAddress),
        stars: 2,
        dateCreated: new Date(Date.now() - 86400000 * 5).toISOString()
      }
    ];
  }

  updateUserNFTs();
  updateUserStats();
}

// Update user NFTs UI
function updateUserNFTs() {
  const container = document.getElementById('myNFTs');
  if (!container) return; 
  
  container.innerHTML = '';

  if (window.state.myNFTs.length === 0) {
    container.innerHTML = '<p>You haven\'t created any NFTs yet!</p>';
    return;
  }

  window.state.myNFTs.forEach(nft => {
    const nftCard = createNFTCard(nft, false);
    container.appendChild(nftCard);
  });

  updateUserStats();
}

// Update user stats
function updateUserStats() {
  if (!window.state.walletConnected) return;

  const submissionsElement = document.getElementById('totalSubmissions');
  const starsElement = document.getElementById('totalStars');
  const rewardsElement = document.getElementById('totalRewards');
  
  if (!submissionsElement || !starsElement || !rewardsElement) return;

  const totalSubmissions = window.state.myNFTs.length;
  let totalStars = 0;

  window.state.myNFTs.forEach(nft => {
    totalStars += nft.stars;
  });

  // Calculate rewards (in a real app, this would come from the blockchain)
  const totalRewards = Math.floor(totalStars * 5);

  submissionsElement.textContent = totalSubmissions;
  starsElement.textContent = totalStars;
  rewardsElement.textContent = totalRewards;
}

// Start voting timer
function startVotingTimer() {
  // Set end date to next Sunday at midnight
  const now = new Date();
  const daysUntilSunday = 7 - now.getDay();
  const endDate = new Date(now);
  endDate.setDate(now.getDate() + daysUntilSunday);
  endDate.setHours(23, 59, 59, 999);

  clearInterval(window.state.timerInterval);

  window.state.timerInterval = setInterval(() => {
    const timeLeft = endDate - new Date();

    if (timeLeft <= 0) {
      clearInterval(window.state.timerInterval);
      document.getElementById('votingTimer').textContent = 'Voting ended';
      return;
    }

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    document.getElementById('votingTimer').textContent = `${days} days, ${hours} hours, ${minutes} minutes`;
  }, 60000); // Update every minute

  // Initial update
  const timeLeft = endDate - new Date();
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  document.getElementById('votingTimer').textContent = `${days} days, ${hours} hours`;
}

// Load mock data for demo
function loadMockData(state) {
  // Mock weekly collection
  state.weeklyCollection = [
    {
      id: '1',
      title: 'Crazy Cosmic Doodle',
      description: 'A wild cosmic adventure',
      image: createMockNFTImage('#FF6B6B', 'CCD'),
      creator: 'stars1abc...def',
      creatorShort: 'stars1abc...def',
      stars: 4,
      dateCreated: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: '2',
      title: 'Silly Space Puppy',
      description: 'My pet dog in space',
      image: createMockNFTImage('#4ECDC4', 'SSP'),
      creator: 'stars2ghi...jkl',
      creatorShort: 'stars2ghi...jkl',
      stars: 3,
      dateCreated: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: '3',
      title: 'Rainbow Friends',
      description: 'Friends holding hands under a rainbow',
      image: createMockNFTImage('#F7B801', 'RF'),
      creator: 'stars3mno...pqr',
      creatorShort: 'stars3mno...pqr',
      stars: 5,
      dateCreated: new Date(Date.now() - 86400000 * 1).toISOString()
    }
  ];

  updateWeeklyCollection();
}

// Create mock NFT image for demo
function createMockNFTImage(color, text) {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 200, 200);

  // Text
  ctx.fillStyle = 'white';
  ctx.font = '48px Gaegu';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 100, 100);

  // Add some doodles
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const x = Math.random() * 200;
    const y = Math.random() * 200;
    const size = Math.random() * 30 + 10;
    ctx.moveTo(x, y);
    ctx.arc(x, y, size, 0, Math.PI * 2);
  }
  ctx.stroke();

  return canvas.toDataURL();
}

function shortenAddress(address) {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}