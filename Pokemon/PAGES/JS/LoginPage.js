const API_BASE_URL = "http://localhost:5000/api";

let isLoginMode = true;

function showMessage(message, isError = true) {
  const msgEl = document.getElementById("message");
  if (!msgEl) return;
  msgEl.textContent = message;
  msgEl.className = "message " + (isError ? "error" : "success");
  msgEl.classList.remove("hidden");
}

function clearMessage() {
  const msgEl = document.getElementById("message");
  if (!msgEl) return;
  msgEl.textContent = "";
  msgEl.classList.add("hidden");
}

function updateUI() {
  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");
  const btnText = document.getElementById("btnText");

  if (loginTab && registerTab) {
    loginTab.classList.toggle("active", isLoginMode);
    registerTab.classList.toggle("active", !isLoginMode);
  }

  if (btnText) {
    btnText.textContent = isLoginMode ? "Sign In" : "Create Account";
  }
}

// Starter Pokemon options (Gen 1 starters + Pikachu/Eevee as alternatives)
const STARTER_POKEMON = [
  { name: "bulbasaur", displayName: "Bulbasaur" },
  { name: "charmander", displayName: "Charmander" },
  { name: "squirtle", displayName: "Squirtle" },
  { name: "pikachu", displayName: "Pikachu" },
  { name: "eevee", displayName: "Eevee" }
];

// Show starter selection modal
function showStarterModal(username) {
  // Randomly select 3 starters
  const shuffled = [...STARTER_POKEMON].sort(() => 0.5 - Math.random());
  const options = shuffled.slice(0, 3);
  
  const modalHtml = `
    <div id="starterModal" class="modal-overlay">
      <div class="modal-content">
        <h2>Choose Your Starter!</h2>
        <p>Pick one of these Pokemon to start your journey:</p>
        <div class="starter-options">
          ${options.map(s => `
            <button class="starter-btn" data-starter="${s.name}">
              <span class="starter-name">${s.displayName}</span>
            </button>
          `).join("")}
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal if any
  const existingModal = document.getElementById("starterModal");
  if (existingModal) existingModal.remove();
  
  // Add modal to page
  document.body.insertAdjacentHTML("beforeend", modalHtml);
  
  // Add styles
  const style = document.createElement("style");
  style.textContent = `
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-content {
      background: #1a1d24;
      border-radius: 16px;
      padding: 30px;
      text-align: center;
      max-width: 400px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .modal-content h2 {
      color: #ffe66d;
      margin: 0 0 10px;
    }
    .modal-content p {
      color: #94a3b8;
      margin-bottom: 20px;
    }
    .starter-options {
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .starter-btn {
      background: #0f172a;
      border: 2px solid #333;
      border-radius: 12px;
      padding: 15px 20px;
      cursor: pointer;
      transition: all 0.2s;
      color: #fff;
    }
    .starter-btn:hover {
      border-color: #ffe66d;
      transform: translateY(-3px);
    }
    .starter-name {
      font-weight: 600;
    }
  `;
  document.head.appendChild(style);
  
  // Add click handlers
  document.querySelectorAll(".starter-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const starter = btn.dataset.starter;
      await selectStarter(username, starter);
    });
  });
}

// Send starter choice to server
async function selectStarter(username, starter) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/choose-starter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, starterPokemon: starter })
    });
    
    if (!response.ok) {
      throw new Error("Failed to select starter");
    }
    
    const data = await response.json();
    console.log("Starter selected:", data);
    
    // Close modal and redirect
    const modal = document.getElementById("starterModal");
    if (modal) modal.remove();
    
    window.location.href = "index.html";
  } catch (error) {
    console.error("Error selecting starter:", error);
    alert("Failed to select starter. Please try again.");
  }
}

async function handleAuth(username, password) {
  const endpoint = isLoginMode ? "/auth/login" : "/auth/register";
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log("Auth request to:", url);
  console.log("Payload:", { username, password });
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  console.log("Response status:", response.status);
  
  const data = await response.json();
  console.log("Response data:", data);
  
  if (!response.ok) {
    throw new Error(data.message || (isLoginMode ? "Login failed" : "Registration failed"));
  }
  
  return data;
}

document.addEventListener("DOMContentLoaded", function() {
  const form = document.getElementById("authForm");
  if (!form) {
    console.error("Form not found!");
    return;
  }

  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");

  if (loginTab) {
    loginTab.addEventListener("click", function() {
      isLoginMode = true;
      clearMessage();
      updateUI();
    });
  }

  if (registerTab) {
    registerTab.addEventListener("click", function() {
      isLoginMode = false;
      clearMessage();
      updateUI();
    });
  }

  form.addEventListener("submit", async function(event) {
    event.preventDefault();
    
    const username = document.getElementById("username")?.value?.trim();
    const password = document.getElementById("password")?.value;

    if (!username || username.length < 3) {
      showMessage("Username must be at least 3 characters");
      return;
    }

    if (!password || password.length < 4) {
      showMessage("Password must be at least 4 characters");
      return;
    }

    const submitBtn = form.querySelector(".submit-btn");
    if (submitBtn) submitBtn.disabled = true;

    try {
      const data = await handleAuth(username, password);
      
      localStorage.setItem("accountUsername", username);
      localStorage.setItem("playerName", username);
      
      showMessage(isLoginMode ? "Login successful!" : "Account created!", false);
      
      setTimeout(() => {
        window.location.href = "index.html";
      }, 500);
    } catch (error) {
      showMessage(error.message);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});
