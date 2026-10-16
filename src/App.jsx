import { useEffect, useMemo, useState } from "react";
import "./App.css";
import AdminDashboard from "./AdminDashboard";
const API_URL = "https://maison-fashion-store-analytics.onrender.com/api/products";
const AUTH_API_URL = "https://maison-fashion-store-analytics.onrender.com/api/auth";
const PROFILE_API_URL = "https://maison-fashion-store-analytics.onrender.com/api/profile";
const ORDERS_API_URL = "https://maison-fashion-store-analytics.onrender.com/api/orders";

const categories = [
  "All",
  "Women",
  "Men",
  "Footwear",
  "Accessories",
  "Beauty",
];

function money(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(price) || 0);
}

function isValidGmail(email) {
  const value = String(email || "").trim();
  const parts = value.split("@");

  if (parts.length !== 2) return false;

  const [local, domain] = parts;

  return (
    /^[a-zA-Z0-9](?:[a-zA-Z0-9._+-]*[a-zA-Z0-9])?$/.test(local) &&
    !local.includes("..") &&
    domain.toLowerCase() === "gmail.com"
  );
}

function readSavedUser() {
  try {
    const saved = localStorage.getItem("maisonUser");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}
async function trackActivity(eventType, pageUrl = window.location.hash || "/") {
  const token = localStorage.getItem("token");

  if (!token) return;

  try {
    const response = await fetch(
      "https://maison-fashion-store-analytics.onrender.com/api/activity/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          eventType,
          pageUrl,
        }),
      }
    );

    if (!response.ok) {
      console.error(
        "Activity tracking failed:",
        response.status,
        await response.text()
      );
    }
  } catch (error) {
    console.error("Activity tracking failed:", error);
  }
}

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productError, setProductError] = useState("");

  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [notice, setNotice] = useState("");

  const [bagOpen, setBagOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentSuccessful, setPaymentSuccessful] = useState(false);
  const [deliveryDetails, setDeliveryDetails] = useState({
  customerName: "",
  customerEmail: "",
  phone: "",
  shippingAddress: "",
  city: "",
  postalCode: "",
});
  const [placingOrder, setPlacingOrder] = useState(false);

  const [accountView, setAccountView] = useState("");
  const [adminView, setAdminView] = useState(false);
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState("");

  const token = user?.token;
  
  // Track page views after login and on browser navigation
  useEffect(() => {
    if (!user?.token) return;

    const recordPageView = () => {
      const pageUrl =
        window.location.hash || window.location.pathname || "/";

      trackActivity("PAGE_VIEW", pageUrl);
    };

    recordPageView();

    window.addEventListener("hashchange", recordPageView);
    window.addEventListener("popstate", recordPageView);

    return () => {
      window.removeEventListener("hashchange", recordPageView);
      window.removeEventListener("popstate", recordPageView);
    };
  }, [user?.token]);

// Refresh the current session every 60 seconds.
useEffect(() => {
  if (!user?.token) return;

  const sendHeartbeat = () => {
    trackActivity(
      "HEARTBEAT",
      window.location.hash || window.location.pathname || "/"
    );
  };

  // Refresh once after login, then every 60 seconds.
  sendHeartbeat();

  const heartbeatId = window.setInterval(() => {
    sendHeartbeat();
  }, 60_000);

  return () => {
    window.clearInterval(heartbeatId);
  };
}, [user?.token]);

  const authHeaders = token
    ? {
        Authorization: `${user?.tokenType || "Bearer"} ${token}`,
      }
    : {};

  // Load products from backend
  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        setLoading(true);
        setProductError("");

        const response = await fetch(API_URL, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Products API failed (${response.status})`);
        }

        const data = await response.json();

        setProducts(Array.isArray(data) ? data : []);
      } catch (error) {
        if (error.name !== "AbortError") {
          setProductError(
            "Products load nahi ho paaye. Check karo ki backend running hai."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => controller.abort();
  }, []);

  // Filter products
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        category === "All" || String(product.category) === category;

      const matchesSearch =
        String(product.name ?? "").toLowerCase().includes(query) ||
        String(product.category ?? "").toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [products, category, search]);

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  function openAuth(mode = "login") {
    setAuthMode(mode);
    setAuthError("");
    setAuthOpen(true);
  }
// Login and registration
async function handleAuthSubmit(event) {
  event.preventDefault();
  setAuthError("");

  const formData = new FormData(event.currentTarget);

  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("fullName") || "").trim();

  if (!isValidGmail(email)) {
    setAuthError(
      "Invalid email. Please enter a valid Gmail address ending in @gmail.com."
    );
    return;
  }

  if (authMode === "register" && !fullName) {
    setAuthError("Please enter your full name.");
    return;
  }

  if (authMode === "register" && password.length < 8) {
    setAuthError("Password must contain at least 8 characters.");
    return;
  }

  setAuthLoading(true);

  const currentMode = authMode;

  const payload =
    currentMode === "register"
      ? { fullName, email, password }
      : { email, password };

  try {
    const response = await fetch(
      `${AUTH_API_URL}/${currentMode === "register" ? "register" : "login"}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 409) {
        throw new Error(
          "This email is already registered. Please log in."
        );
      }

      if (response.status === 404 && currentMode === "login") {
        throw new Error("Account not found. Please register first.");
      }

      throw new Error(
        data.detail ||
          data.message ||
          (response.status === 401
            ? "Invalid email or password."
            : "Authentication failed. Please try again.")
      );
    }

    // Registration ke baad user ko automatically login nahi karna hai.
    if (currentMode === "register") {
      setAuthMode("login");
      setAuthError("");
      setNotice(
        "Account created successfully! Please login with your email and password."
      );

      // Registration form ko login form mein badlo.
      // User state/token set mat karo.
      return;
    }

    // Sirf successful LOGIN ke baad session set hoga.
    if (!data.token) {
      throw new Error(
        "Login response mein token nahi mila. Backend login response check karo."
      );
    }
    // Save authentication data for both frontends
localStorage.setItem("token", data.token);
localStorage.setItem("role", String(data.role || "CUSTOMER").toUpperCase());
localStorage.setItem("email", data.email || email);
localStorage.setItem(
  "username",
  data.fullName || data.full_name || fullName
);
localStorage.setItem(
  "maisonUser",
  JSON.stringify({
    ...data,
    email: data.email || email,
    fullName: data.fullName || data.full_name || fullName,
    role: String(data.role || "CUSTOMER").toUpperCase(),
  })
);

    setUser({
      ...data,
      email: data.email || email,
      fullName: data.fullName || data.full_name || fullName,
      role: String(data.role || "CUSTOMER").toUpperCase(),
    });

    setAuthOpen(false);
    setAccountView("");
    setProfile(null);
    setOrders([]);
    setAccountError("");

    showNotice(
      String(data.role || "CUSTOMER").toUpperCase() === "ADMIN"
        ? "Admin login successful!"
        : "Welcome back!"
    );
  } catch (error) {
    setAuthError(
      error.message ||
        "Could not connect to the backend. Check that it is running."
    );
  } finally {
    setAuthLoading(false);
  }
}
async function handleLogout() {
  await trackActivity("LOGOUT", "/logout");

  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("email");
  localStorage.removeItem("username");
  localStorage.removeItem("maisonUser");

  setUser(null);
  setProfile(null);
  setOrders([]);
  setAccountView("");
  setAuthOpen(false);
  setBagOpen(false);
  setCheckoutOpen(false);
  setPaymentSuccessful(false);
  setCart([]);
  setAccountError("");

  showNotice("You have logged out. Please login to continue.");
}


  // Add product to bag
  function addToCart(product) {
    if (Number(product.stock) <= 0) {
      showNotice("This product is currently unavailable.");
      return;
    }

    const existingQuantity = cart
      .filter((item) => String(item.id) === String(product.id))
      .reduce((sum, item) => sum + item.quantity, 0);

    if (existingQuantity >= Number(product.stock)) {
      showNotice("You have added all available stock to your bag.");
      return;
    }

    setCart((current) => {
      const existing = current.find(
        (item) => String(item.id) === String(product.id)
      );

      if (existing) {
        return current.map((item) =>
          String(item.id) === String(product.id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });
     trackActivity(
  "ADD_TO_CART",
  `/products/${product.id}`
);
    showNotice(`${product.name} added to your bag.`);
    
  }

  function updateQuantity(productId, change) {
    setCart((current) =>
      current.map((item) => {
        if (String(item.id) !== String(productId)) {
          return item;
        }

        const next = item.quantity + change;

        if (next < 1) return item;

        const product = products.find(
          (p) => String(p.id) === String(productId)
        );

        if (product && next > Number(product.stock)) {
          showNotice("Maximum available stock reached.");
          return item;
        }

        return { ...item, quantity: next };
      })
    );
  }

  function removeFromCart(productId) {
    setCart((current) =>
      current.filter((item) => String(item.id) !== String(productId))
    );

    showNotice("Product removed from your bag.");
  }

  const cartCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * item.quantity,
    0
  );

  function handleContinueCheckout() {
    setBagOpen(false);

    if (!user) {
      openAuth("login");
      showNotice("Please login or register to continue checkout.");
      return;
    }

    if (!cart.length) {
      showNotice("Your bag is empty.");
      return;
    }

    setPaymentSuccessful(false);
    trackActivity("CHECKOUT_STARTED", "/checkout");
setCheckoutOpen(true);
    
  }

  // Simulate demo payment only
  function handlePaymentSubmit(event) {
    event.preventDefault();

    if (!user) {
      setCheckoutOpen(false);
      openAuth("login");
      showNotice("Please login to continue checkout.");
      return;
    }

    if (!cart.length) {
      showNotice("Your bag is empty.");
      return;
    }

    const formData = new FormData(event.currentTarget);

    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();

    if (!isValidGmail(email)) {
      showNotice(
        "Invalid email. Please use a valid Gmail address ending in @gmail.com."
      );
      return;
    }
    const customerName = String(formData.get("name") || "").trim();
const phone = String(formData.get("phone") || "").trim();
const shippingAddress = String(formData.get("address") || "").trim();
const city = String(formData.get("city") || "").trim();
const postalCode = String(formData.get("pincode") || "").trim();

if (
  !customerName ||
  !phone ||
  !shippingAddress ||
  !city ||
  !postalCode
) {
  showNotice("Please complete all delivery details.");
  return;
}

setDeliveryDetails({
  customerName,
  customerEmail: email,
  phone,
  shippingAddress,
  city,
  postalCode,
});

    // Demo only: no real money is charged here.
    setPaymentSuccessful(true);

    showNotice(
      `Demo payment successful via ${
        paymentMethod === "UPI" ? "UPI" : "Card"
      }. Now select Place Order to save the order.`
    );
  }


async function handlePlaceOrder() {
  if (!user || !token) {
    setPaymentSuccessful(false);
    openAuth("login");
    showNotice("Please login again before placing your order.");
    return;
  }

  if (!cart.length) {
    showNotice("Your bag is empty.");
    return;
  }

  const {
    customerName,
    customerEmail,
    phone,
    shippingAddress,
    city,
    postalCode,
  } = deliveryDetails;

  if (
    !customerName?.trim() ||
    !customerEmail?.trim() ||
    !phone?.trim() ||
    !shippingAddress?.trim() ||
    !city?.trim() ||
    !postalCode?.trim()
  ) {
    showNotice("Delivery details missing. Please go back to checkout.");
    setPaymentSuccessful(false);
    return;
  }

  setPlacingOrder(true);

  try {
    const response = await fetch(ORDERS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        phone: phone.trim(),
        shippingAddress: shippingAddress.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        paymentMethod:
          paymentMethod === "UPI" ? "UPI_DEMO" : "CARD_DEMO",
        items: cart.map((item) => ({
          productId: Number(item.id),
          quantity: item.quantity,
        })),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Your login session may have expired. Please log in again."
      );
    }

    if (!response.ok) {
      throw new Error(
        data.detail ||
          data.message ||
          data.error ||
          `Could not save order (${response.status}). Please try again.`
      );
    }

    setCart([]);
    setCheckoutOpen(false);
    setPaymentSuccessful(false);
    setPaymentMethod("UPI");

    trackActivity("ORDER_PLACED", "/orders");

    showNotice(
      `Order ${data.orderNumber || data.order_number || ""} placed and saved successfully!`
    );

    await openAccountSection("orders");
  } catch (error) {
    showNotice(
      error.message ||
        "Order save nahi hua. Cart is still preserved; please try again."
    );
  } finally {
    setPlacingOrder(false);
  }
}


  // Load profile or order history
  async function openAccountSection(section) {
    if (!user || !token) {
      openAuth("login");
      showNotice("Please login to view your account.");
      return;
    }

    setAccountView(section);
    setAccountLoading(true);
    setAccountError("");

    try {
      const url =
        section === "profile" ? PROFILE_API_URL : ORDERS_API_URL;

      const response = await fetch(url, {
        headers: authHeaders,
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Your login session may have expired. Please logout and login again."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            `Could not load ${section} (${response.status}).`
        );
      }

      if (section === "profile") {
        setProfile(data);
      } else {
        setOrders(
          Array.isArray(data)
            ? data
            : Array.isArray(data.orders)
              ? data.orders
              : []
        );
      }
    } catch (error) {
      setAccountError(
        error.message || "Could not connect to the backend."
      );

      if (section === "orders") {
        setOrders([]);
      }
    } finally {
      setAccountLoading(false);
    }
  }
 
if (user?.role === "ADMIN") {
  return (
    <AdminDashboard
      token={user.token}
      tokenType={user.tokenType || "Bearer"}
      onBack={() => {}}
      onProductsChanged={async () => {
        try {
          const response = await fetch(API_URL);
          if (!response.ok) return;

          const data = await response.json();
          setProducts(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error("Products refresh failed:", error);
        }
      }}
    />
  );
}

  return (
    <div className="store">
      <div className="announcement">
        Complimentary shipping on orders over ₹2,999
        <span> · </span>
        Thoughtfully chosen. Beautifully worn.
      </div>

      <header className="navbar">
        <a className="brand" href="#home" aria-label="Maison home">
          MAISON<span>.</span>
          <small>THE EVERYDAY EDIT</small>
        </a>

        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#collections">Collections</a>
          <a href="#products">Shop</a>
        </nav>

        <div className="nav-actions">
          <input
            aria-label="Search products"
            className="search"
            placeholder="Search pieces..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);

              document
                .getElementById("products")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          />

          {user ? (
            <>
              <span className="account-name">
                Hi, {user.fullName || "Customer"}
              </span>
              {user?.role === "ADMIN" && (
  <button
    className="account-button"
    type="button"
    onClick={() => setAdminView(true)}
  >
    Admin Panel
  </button>
)}
              <button
                className="account-button"
                type="button"
                onClick={() => openAccountSection("profile")}
              >
                My Profile
              </button>

              <button
                className="account-button"
                type="button"
                onClick={() => openAccountSection("orders")}
              >
                My Orders
              </button>

              <button
                className="account-button"
                type="button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <button
              className="account-button"
              type="button"
              onClick={() => openAuth("login")}
            >
              Login / Register
            </button>
          )}

          <button
            className="cart-button"
            type="button"
            onClick={() => setBagOpen(true)}
          >
            Bag ({cartCount})
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-copy">
            <p className="eyebrow">THE NEW SEASON / 2026</p>

            <h1>
              Wear your
              <br />
              own kind of
              <br />
              <em>beautiful.</em>
            </h1>

            <p className="hero-description">
              Considered essentials. Timeless silhouettes. Pieces that
              feel as good as they look.
            </p>

            <a className="primary-button" href="#products">
              Discover the collection <span>↗</span>
            </a>

            <p className="hero-note">
              DESIGNED FOR YOUR EVERYDAY
            </p>
          </div>

          <div className="hero-image">
            <img
              src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=85"
              alt="Model wearing a contemporary fashion look"
            />

            <div className="image-label">
              <span>01 / THE EDIT</span>
              <strong>Effortless, always.</strong>
            </div>
          </div>
        </section>

        <section className="category-section" id="collections">
          <div>
            <p className="eyebrow">FIND YOUR FIT</p>
            <h2>Shop by collection</h2>
          </div>

          <div className="category-list">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={`category-chip ${
                  category === item ? "selected" : ""
                }`}
                onClick={() => {
                  setCategory(item);

                  document
                    .getElementById("products")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {item}
                <span>↗</span>
              </button>
            ))}
          </div>
        </section>

        <section className="products-section" id="products">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE MAISON SELECTION</p>
              <h2>Pieces to live in</h2>
            </div>

            <span className="product-count">
              {filteredProducts.length} PIECES
            </span>
          </div>

          {loading ? (
            <p className="empty-state">Loading products...</p>
          ) : productError ? (
            <p className="empty-state">{productError}</p>
          ) : (
            <>
              
<div className="product-grid">
  {filteredProducts.map((product) => (
    <article
      className="product-card"
      key={product.id}
      onClick={() =>
        trackActivity("PRODUCT_VIEW", `/products/${product.id}`)
      }
    >
      <div className="product-image">
        <img
          src={
            product.imageUrl ||
            product.image_url ||
            "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80"
          }
          alt={product.name}
        />

        {Number(product.stock) <= 0 && (
          <span className="product-tag">SOLD OUT</span>
        )}

        <button
          className="quick-add"
          type="button"
          disabled={Number(product.stock) <= 0}
          onClick={(event) => {
            event.stopPropagation();
            addToCart(product);
          }}
        >
          {Number(product.stock) <= 0
            ? "Sold out"
            : "+ Add to bag"}
        </button>
      </div>

      <div className="product-info">
        <div>
          <h3>{product.name}</h3>
          <p>{product.category}</p>

          <p>
            {Number(product.stock) > 0
              ? `${product.stock} available`
              : "Currently unavailable"}
          </p>
        </div>

        <strong>{money(product.price)}</strong>
      </div>
    </article>
  ))}
</div>


              {filteredProducts.length === 0 && (
                <p className="empty-state">
                  No pieces found. Try another search or category.
                </p>
              )}
            </>
          )}
        </section>

        <section className="newsletter">
          <p className="eyebrow">A LITTLE NOTE FROM US</p>
          <h2>Good things, delivered.</h2>
          <p>New arrivals, thoughtful edits and a little inspiration.</p>
          <a href="#home" className="newsletter-link">
            Explore the collection ↗
          </a>
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#home">
          MAISON<span>.</span>
          <small>THE EVERYDAY EDIT</small>
        </a>

        <p>Thoughtfully chosen. Made for your everyday.</p>
        <span>© 2026 MAISON. Demo storefront.</span>
      </footer>

      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}

      {/* LOGIN / REGISTER */}
      {authOpen && (
        <div
          className="bag-overlay auth-overlay"
          onClick={() => {
            if (!authLoading) {
              setAuthOpen(false);
              setAuthError("");
            }
          }}
        >
          <section
            className="auth-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bag-header">
              <div>
                <p className="eyebrow">WELCOME TO MAISON</p>
                <h2 id="auth-title">
                  {authMode === "register"
                    ? "Create your account"
                    : "Welcome back"}
                </h2>
              </div>

              <button
                className="bag-close"
                type="button"
                aria-label="Close login form"
                disabled={authLoading}
                onClick={() => setAuthOpen(false)}
              >
                ✕
              </button>
            </div>

            <form
              className="checkout-form auth-form"
              onSubmit={handleAuthSubmit}
            >
              {authMode === "register" && (
                <>
                  <label htmlFor="auth-full-name">Full name</label>
                  <input
                    id="auth-full-name"
                    name="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    autoComplete="name"
                    maxLength={100}
                    required
                  />
                </>
              )}

              <label htmlFor="auth-email">Gmail address</label>
              <input
                id="auth-email"
                name="email"
                type="email"
                placeholder="yourname@gmail.com"
                autoComplete="email"
                maxLength={255}
                required
              />

              <small className="checkout-note">
                Please use a valid address ending in @gmail.com.
              </small>

              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                name="password"
                type="password"
                placeholder={
                  authMode === "register"
                    ? "At least 8 characters"
                    : "Enter your password"
                }
                autoComplete={
                  authMode === "register"
                    ? "new-password"
                    : "current-password"
                }
                minLength={authMode === "register" ? 8 : 1}
                maxLength={72}
                required
              />

              {authError && (
                <p className="auth-error" role="alert">
                  {authError}
                </p>
              )}

              <button
                className="primary-button bag-checkout"
                type="submit"
                disabled={authLoading}
              >
                {authLoading
                  ? "Please wait..."
                  : authMode === "register"
                    ? "Create account →"
                    : "Login →"}
              </button>

              <p className="auth-switch">
                {authMode === "register"
                  ? "Already have an account?"
                  : "New to MAISON?"}{" "}
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => {
                    setAuthMode(
                      authMode === "register" ? "login" : "register"
                    );
                    setAuthError("");
                  }}
                >
                  {authMode === "register" ? "Login" : "Create account"}
                </button>
              </p>
            </form>
          </section>
        </div>
      )}

      {/* SHOPPING BAG */}
      {bagOpen && (
        <div
          className="bag-overlay"
          onClick={() => setBagOpen(false)}
        >
          <section
            className="bag-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping bag"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bag-header">
              <div>
                <p className="eyebrow">YOUR SELECTION</p>
                <h2>Your bag ({cartCount})</h2>
              </div>

              <button
                className="bag-close"
                type="button"
                onClick={() => setBagOpen(false)}
                aria-label="Close shopping bag"
              >
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="bag-empty">
                <p>Your bag is waiting for something lovely.</p>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => setBagOpen(false)}
                >
                  Continue shopping ↗
                </button>
              </div>
            ) : (
              <>
                <div className="bag-items">
                  {cart.map((item) => (
                    <article className="bag-item" key={item.id}>
                      <img
                        src={
                          item.imageUrl ||
                          item.image_url ||
                          "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=300&q=80"
                        }
                        alt={item.name}
                      />

                      <div className="bag-item-info">
                        <h3>{item.name}</h3>
                        <p>{item.category}</p>
                        <strong>{money(item.price)}</strong>

                        <div className="quantity-control">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            aria-label={`Decrease ${item.name} quantity`}
                          >
                            −
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            aria-label={`Increase ${item.name} quantity`}
                          >
                            +
                          </button>
                        </div>

                        <button
                          className="bag-remove"
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                        >
                          Remove
                        </button>
                      </div>

                      <strong className="bag-line-total">
                        {money(Number(item.price) * item.quantity)}
                      </strong>
                    </article>
                  ))}
                </div>

                <div className="bag-footer">
                  <div className="bag-subtotal">
                    <span>Subtotal</span>
                    <strong>{money(cartTotal)}</strong>
                  </div>

                  <p>
                    Shipping and taxes are calculated at checkout.
                    Demo payments only.
                  </p>

                  <button
                    className="primary-button bag-checkout"
                    type="button"
                    onClick={handleContinueCheckout}
                  >
                    Continue to checkout →
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* CHECKOUT AND DEMO PAYMENT */}
      {checkoutOpen && (
        <div
          className="bag-overlay checkout-overlay"
          onClick={() => {
            if (!placingOrder) setCheckoutOpen(false);
          }}
        >
          <section
            className="bag-drawer checkout-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Checkout"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bag-header">
              <div>
                <p className="eyebrow">MAISON CHECKOUT</p>
                <h2>
                  {paymentSuccessful
                    ? "Payment successful"
                    : "Delivery details"}
                </h2>
              </div>

              <button
                className="bag-close"
                type="button"
                onClick={() => {
                  if (!placingOrder) setCheckoutOpen(false);
                }}
                aria-label="Close checkout"
              >
                ✕
              </button>
            </div>

            {!paymentSuccessful ? (
              <form
                className="checkout-form"
                onSubmit={handlePaymentSubmit}
              >
                <label htmlFor="checkout-name">Full name</label>
                <input
                  id="checkout-name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  defaultValue={user?.fullName || ""}
                  maxLength={100}
                  required
                />

                <label htmlFor="checkout-email">Gmail address</label>
                <input
                  id="checkout-email"
                  name="email"
                  type="email"
                  placeholder="yourname@gmail.com"
                  defaultValue={user?.email || ""}
                  maxLength={255}
                  required
                />

                <small className="checkout-note">
                  Use a valid email ending in @gmail.com.
                </small>

                <label htmlFor="checkout-phone">Phone number</label>
                <input
                  id="checkout-phone"
                  name="phone"
                  type="tel"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  required
                />

                <label htmlFor="checkout-address">
                  Delivery address
                </label>
                <textarea
                  id="checkout-address"
                  name="address"
                  placeholder="House number, street, area"
                  rows={3}
                  maxLength={500}
                  required
                />

                <label htmlFor="checkout-city">City</label>
                <input
                  id="checkout-city"
                  name="city"
                  type="text"
                  maxLength={100}
                  placeholder="City"
                  required
                />

                <label htmlFor="checkout-pincode">PIN code</label>
                <input
                  id="checkout-pincode"
                  name="pincode"
                  type="text"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="6-digit PIN code"
                  required
                />

                <div className="payment-section">
                  <h3>Payment method</h3>

                  <label className="payment-option">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="UPI"
                      checked={paymentMethod === "UPI"}
                      onChange={() => setPaymentMethod("UPI")}
                    />

                    <span>
                      <strong>UPI Demo</strong>
                      <small>
                        Simulated payment success; no money is charged.
                      </small>
                    </span>
                  </label>

                  <label className="payment-option">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="CARD"
                      checked={paymentMethod === "CARD"}
                      onChange={() => setPaymentMethod("CARD")}
                    />

                    <span>
                      <strong>Credit / Debit Card Demo</strong>
                      <small>
                        Demo only. Do not enter real card details.
                      </small>
                    </span>
                  </label>
                </div>

                <div className="checkout-summary">
                  <span>Order total</span>
                  <strong>{money(cartTotal)}</strong>
                </div>

                <p className="checkout-note">
                  Click Pay Demo to simulate payment. The order is not
                  saved until you press Place Order on the next screen.
                </p>

                <button
                  className="primary-button bag-checkout"
                  type="submit"
                >
                  Pay Demo · {money(cartTotal)} →
                </button>
              </form>
            ) : (
              <div className="payment-success-panel">
                <div className="payment-success-icon">✓</div>

                <p className="eyebrow">DEMO PAYMENT CONFIRMED</p>
                <h3>You're one step away.</h3>

                <p>
                  Your demo payment was successful using{" "}
                  {paymentMethod === "UPI" ? "UPI" : "Card"}.
                  No real money was charged.
                </p>

                <div className="checkout-summary">
                  <span>Order total</span>
                  <strong>{money(cartTotal)}</strong>
                </div>

                <p className="checkout-note">
                  Your order will be saved to your account and PostgreSQL
                  only after you click Place Order.
                </p>

                <button
                  className="primary-button bag-checkout"
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={placingOrder}
                >
                  {placingOrder ? "Saving order..." : "Place Order →"}
                </button>

                <button
                  className="secondary-action"
                  type="button"
                  disabled={placingOrder}
                  onClick={() => setPaymentSuccessful(false)}
                >
                  Back to checkout
                </button>
              </div>
            )}
          </section>
        </div>
      )}


{/* MAISON MY ACCOUNT DASHBOARD */}
{accountView && (
  <div
    className="account-dashboard-overlay"
    onClick={() => setAccountView("")}
  >
    <section
      className="account-dashboard"
      role="dialog"
      aria-modal="true"
      aria-label="My MAISON account"
      onClick={(event) => event.stopPropagation()}
    >
      {/* Dashboard Header */}
      <header className="account-dashboard-header">
        <div>
          <p className="eyebrow">MAISON • YOUR PERSONAL SPACE</p>
          <h2>My Account</h2>
          <p>
            Welcome back, {user?.fullName || "Customer"}.
          </p>
        </div>

        <button
          className="bag-close"
          type="button"
          onClick={() => setAccountView("")}
          aria-label="Close account dashboard"
        >
          ✕
        </button>
      </header>

      <div className="account-dashboard-layout">
        {/* Sidebar */}
        <aside className="account-sidebar">
          <div className="account-sidebar-user">
            <div className="account-avatar">
              {(user?.fullName || "C")
                .trim()
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="account-sidebar-user-info">
              <strong>{user?.fullName || "Customer"}</strong>
              <span>{user?.email || ""}</span>
            </div>
          </div>

          <button
            type="button"
            className={`account-nav-item ${
              accountView === "profile" ? "active" : ""
            }`}
            onClick={() => openAccountSection("profile")}
          >
            <span>👤</span>
            My Profile
          </button>

          <button
            type="button"
            className={`account-nav-item ${
              accountView === "orders" ? "active" : ""
            }`}
            onClick={() => openAccountSection("orders")}
          >
            <span>📦</span>
            My Orders
          </button>

          <button
            type="button"
            className="account-nav-item"
            onClick={() => {
              setAccountView("");
              setBagOpen(true);
            }}
          >
            <span>♡</span>
            Shopping Bag
          </button>

          <button
            type="button"
            className="account-nav-item account-logout-item"
            onClick={handleLogout}
          >
            <span>↪</span>
            Logout
          </button>
        </aside>

        {/* Main Content */}
        <main className="account-dashboard-main">
          {accountLoading ? (
            <div className="account-message">
              <p className="eyebrow">PLEASE WAIT</p>
              <h3>Loading your account...</h3>
              <p>Your personal information is being retrieved.</p>
            </div>
          ) : accountError ? (
            <div className="account-message">
              <h3>Unable to load your information</h3>
              <p className="auth-error">{accountError}</p>

              <button
                className="primary-button"
                type="button"
                onClick={() => openAccountSection(accountView)}
              >
                Try Again
              </button>
            </div>
          ) : accountView === "profile" ? (
            <div className="account-section-content">
              <p className="eyebrow">ACCOUNT OVERVIEW</p>
              <h3>Personal Information</h3>
              <p className="account-section-description">
                Your MAISON account details.
              </p>

              <div className="account-profile-card">
                <div className="account-profile-card-heading">
                  <div className="account-avatar account-avatar-large">
                    {(profile?.fullName || user?.fullName || "C")
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <h4>
                      {profile?.fullName ||
                        user?.fullName ||
                        "Customer"}
                    </h4>
                    <p>
                      {profile?.email || user?.email || ""}
                    </p>
                  </div>
                </div>

                <div className="account-details-grid">
                  <div className="account-detail">
                    <span>Full Name</span>
                    <strong>
                      {profile?.fullName ||
                        user?.fullName ||
                        "—"}
                    </strong>
                  </div>

                  <div className="account-detail">
                    <span>Email Address</span>
                    <strong>
                      {profile?.email || user?.email || "—"}
                    </strong>
                  </div>

                  <div className="account-detail">
                    <span>Account Type</span>
                    <strong>
                      {profile?.role ||
                        user?.role ||
                        "CUSTOMER"}
                    </strong>
                  </div>

                  <div className="account-detail">
                    <span>Customer ID</span>
                    <strong>
                      {profile?.id ?? user?.id ?? "—"}
                    </strong>
                  </div>

                  <div className="account-detail">
                    <span>Member Since</span>
                    <strong>
                      {formatDate(
                        profile?.createdAt ||
                          profile?.created_at
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="account-action-card">
                <div>
                  <h4>Your Orders</h4>
                  <p>
                    View your purchases and payment details.
                  </p>
                </div>

                <button
                  className="primary-button"
                  type="button"
                  onClick={() => openAccountSection("orders")}
                >
                  View Orders →
                </button>
              </div>
            </div>
          ) : (
            <div className="account-section-content">
              <p className="eyebrow">YOUR PURCHASES</p>
              <h3>My Orders</h3>
              <p className="account-section-description">
                Your order history and payment information.
              </p>

              {orders.length === 0 ? (
                <div className="account-empty-orders">
                  <div className="account-empty-icon">◇</div>
                  <h4>No orders yet</h4>
                  <p>
                    Your purchases will appear here after you
                    place an order.
                  </p>

                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => setAccountView("")}
                  >
                    Continue Shopping →
                  </button>
                </div>
              ) : (
                <div className="account-orders-list">
                  {orders.map((order) => (
                    <article
                      className="account-order-card"
                      key={order.id || order.orderNumber}
                    >
                      <div className="account-order-heading">
                        <div>
                          <span className="eyebrow">
                            ORDER NUMBER
                          </span>
                          <h4>
                            {order.orderNumber || `#${order.id}`}
                          </h4>
                          <p>
                            {formatDate(
                              order.createdAt ||
                                order.created_at
                            )}
                          </p>
                        </div>

                        <span className="order-status">
                          {order.orderStatus ||
                            order.order_status ||
                            order.status ||
                            "PLACED"}
                        </span>
                      </div>

                      <div className="account-order-meta">
                        <div className="account-detail">
                          <span>Payment Method</span>
                          <strong>
                            {String(
                              order.paymentMethod ||
                                order.payment_method ||
                                "—"
                            ).replace("_DEMO", " Demo")}
                          </strong>
                        </div>

                        <div className="account-detail">
                          <span>Payment Status</span>
                          <strong>
                            {order.paymentStatus ||
                              order.payment_status ||
                              "SUCCESS"}
                          </strong>
                        </div>

                        <div className="account-detail">
                          <span>Order Total</span>
                          <strong>
                            {money(
                              order.totalAmount ??
                                order.total_amount ??
                                0
                            )}
                          </strong>
                        </div>
                      </div>

                      <div className="account-order-items">
                        {(order.items || []).map((item, index) => (
                          <div
                            className="order-item-row"
                            key={
                              item.id ||
                              `${item.productId || item.product_id || "item"}-${index}`
                            }
                          >
                            <span>
                              {item.productName ||
                                item.product_name ||
                                "Product"}{" "}
                              × {item.quantity}
                            </span>

                            <strong>
                              {money(
                                item.lineTotal ??
                                  item.line_total ??
                                  Number(
                                    item.unitPrice ??
                                      item.unit_price ??
                                      0
                                  ) * Number(item.quantity || 0)
                              )}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </section>
  </div>
)}
    </div>
  );
}

export default App;
