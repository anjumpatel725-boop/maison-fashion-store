import { useCallback, useEffect, useState } from "react";

import "./AdminDashboard.css";

const API_URL = "https://maison-fashion-store-analytics.onrender.com/api/products";

const USERS_COUNT_API_URL = "https://maison-fashion-store-analytics.onrender.com/api/admin/users/count";

const USERS_API_URL = "https://maison-fashion-store-analytics.onrender.com/api/admin/users/all";

const ORDERS_API_URL = "https://maison-fashion-store-analytics.onrender.com/api/admin/orders";
const ANALYTICS_OVERVIEW_API_URL =
  "https://maison-fashion-store-analytics.onrender.com/api/analytics/overview";
const DELIVERY_STATUSES = [

  "PLACED",

  "CONFIRMED",

  "SHIPPED",

  "OUT_FOR_DELIVERY",

  "DELIVERED",

  "CANCELLED",

];

const emptyProduct = {

  sku: "",

  name: "",

  description: "",

  category: "Women",

  price: "",

  stock: "0",

  imageUrl: "",

};

const productCategories = [

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

function displayStatus(status) {

  return String(status || "PLACED").replaceAll("_", " ");

}

function formatOrderAddress(order) {
  const address =
    order.shippingAddress ??
    order.shipping_address ??
    order.deliveryAddress ??
    order.delivery_address ??
    order.address;

  if (typeof address === "string") {
    return address.trim() || "Address unavailable";
  }

  if (address && typeof address === "object") {
    const parts = [
      address.fullName,
      address.addressLine1,
      address.addressLine2,
      address.street,
      address.landmark,
      address.city,
      address.state,
      address.postalCode ?? address.postal_code ?? address.pincode ?? address.pinCode ?? address.zipCode,
      address.country,
    ].filter((part) => part != null && String(part).trim() !== "");

    return parts.length ? parts.join(", ") : "Address unavailable";
  }

  const parts = [
    order.addressLine1 ?? order.address_line1,
    order.addressLine2 ?? order.address_line2,
    order.city,
    order.state,
    order.postalCode ?? order.postal_code ?? order.pincode ?? order.pinCode ?? order.zipCode,
    order.country,
  ].filter((part) => part != null && String(part).trim() !== "");

  return parts.length ? parts.join(", ") : "Address unavailable";
}

export default function AdminDashboard({

  token,

  tokenType = "Bearer",

  onProductsChanged,

  onLogout,

}) {

  function handleLogout() {
    if (typeof onLogout === "function") {
      onLogout();
      return;
    }

    // Fallback if the parent component does not provide an onLogout callback.
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    localStorage.removeItem("jwtToken");
    window.location.reload();
  }

  const [products, setProducts] = useState([]);

  const [totalUsers, setTotalUsers] = useState(null);
  const [totalRevenue, setTotalRevenue] = useState(null);
const [revenueLoading, setRevenueLoading] = useState(true);
const [revenueError, setRevenueError] = useState("");

  const [users, setUsers] = useState([]);

  const [orders, setOrders] = useState([]);

  const [form, setForm] = useState(emptyProduct);

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);

  const [usersLoading, setUsersLoading] = useState(true);

  const [usersListLoading, setUsersListLoading] = useState(true);

  const [ordersLoading, setOrdersLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const [error, setError] = useState("");

  const [usersError, setUsersError] = useState("");

  const [usersListError, setUsersListError] = useState("");

  const [ordersError, setOrdersError] = useState("");

  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");

  const [userSearch, setUserSearch] = useState("");

  const [ordersSearch, setOrdersSearch] = useState("");

  const [productFilter, setProductFilter] = useState("ALL");

  const [orderFilter, setOrderFilter] = useState("ALL");

  const authHeaders = {

    Authorization: `${tokenType} ${token}`,

  };

  const loadProducts = useCallback(async () => {

    setLoading(true);

    setError("");

    try {

      const response = await fetch(`${API_URL}/admin/all`, {

        headers: authHeaders,

      });

      const data = await response.json().catch(() => []);

      if (!response.ok) {

        throw new Error(

          response.status === 401

            ? "Session expired. Please log in again."

            : response.status === 403

              ? "Admin access denied. Please log in with an admin account."

              : data.detail || data.message || "Could not load products."

        );

      }

      setProducts(Array.isArray(data) ? data : []);

    } catch (err) {

      setError(err.message || "Could not connect to the backend.");

    } finally {

      setLoading(false);

    }

  }, [token, tokenType]);

  const loadTotalUsers = useCallback(async () => {

    setUsersLoading(true);

    setUsersError("");

    try {

      const response = await fetch(USERS_COUNT_API_URL, {

        headers: authHeaders,

      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {

        throw new Error(

          response.status === 401

            ? "Session expired."

            : response.status === 403

              ? "Admin access required."

              : data.message || data.detail || "Could not load total users."

        );

      }

      const count =

        typeof data === "number" ? data : Number(data.totalUsers);

      if (!Number.isFinite(count) || count < 0) {

        throw new Error("The backend returned an invalid user count.");

      }

      setTotalUsers(count);

    } catch (err) {

      setTotalUsers(null);

      setUsersError(err.message || "Could not load users.");

    } finally {

      setUsersLoading(false);

    }

  }, [token, tokenType]);
  
const loadRevenue = useCallback(async () => {
  setRevenueLoading(true);
  setRevenueError("");

  try {
    const response = await fetch(ANALYTICS_OVERVIEW_API_URL, {
      headers: {
        Authorization: `${tokenType} ${token}`,
        Accept: "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        response.status === 401
          ? "Session expired. Please log in again."
          : response.status === 403
            ? "Admin access required to view revenue."
            : data.message || data.detail || "Could not load revenue."
      );
    }

    const revenue = Number(data.totalRevenue);

    if (!Number.isFinite(revenue) || revenue < 0) {
      throw new Error("Invalid revenue value returned by the backend.");
    }

    setTotalRevenue(revenue);
  } catch (err) {
    setTotalRevenue(null);
    setRevenueError(err.message || "Could not load revenue.");
  } finally {
    setRevenueLoading(false);
  }
}, [token, tokenType]);


  const loadUsers = useCallback(async () => {

    setUsersListLoading(true);

    setUsersListError("");

    try {

      const response = await fetch(USERS_API_URL, {

        headers: authHeaders,

      });

      const data = await response.json().catch(() => []);

      if (!response.ok) {

        throw new Error(

          response.status === 401

            ? "Session expired. Please log in again."

            : response.status === 403

              ? "Admin access required."

              : data.detail || data.message || "Could not load registered users."

        );

      }

      setUsers(Array.isArray(data) ? data : []);

    } catch (err) {

      setUsersListError(err.message || "Could not load registered users.");

    } finally {

      setUsersListLoading(false);

    }

  }, [token, tokenType]);

  const loadOrders = useCallback(async () => {

    setOrdersLoading(true);

    setOrdersError("");

    try {

      const response = await fetch(ORDERS_API_URL, {

        headers: authHeaders,

      });

      const data = await response.json().catch(() => []);

      if (!response.ok) {

        throw new Error(

          response.status === 401

            ? "Session expired. Please log in again."

            : response.status === 403

              ? "Admin access required to view orders."

              : data.detail || data.message || "Could not load orders."

        );

      }

      setOrders(Array.isArray(data) ? data : []);

    } catch (err) {

      setOrdersError(err.message || "Could not load orders.");

    } finally {

      setOrdersLoading(false);

    }

  }, [token, tokenType]);

 useEffect(() => {
  loadProducts();
  loadTotalUsers();
  loadUsers();
  loadOrders();
  loadRevenue();
}, [
  loadProducts,
  loadTotalUsers,
  loadUsers,
  loadOrders,
  loadRevenue,
]);

  function goToSection(sectionId) {

    document.getElementById(sectionId)?.scrollIntoView({

      behavior: "smooth",

      block: "start",

    });

  }

  function handleStatKeyDown(event, callback) {

    if (event.key === "Enter" || event.key === " ") {

      event.preventDefault();

      callback();

    }

  }

  function clickableCard(title, value, subtitle, onClick) {

    return (

      <article

        className="admin-stat-card clickable-stat"

        role="button"

        tabIndex={0}

        onClick={onClick}

        onKeyDown={(event) => handleStatKeyDown(event, onClick)}

        aria-label={`${title}: ${value}. Open details`}

      >

        <span>{title}</span>

        <strong>{value}</strong>

        <small>{subtitle}</small>

      </article>

    );

  }

  const filteredUsers = users.filter((user) => {

    const query = userSearch.trim().toLowerCase();

    return (

      String(user.fullName || user.full_name || "")

        .toLowerCase()

        .includes(query) ||

      String(user.email || "").toLowerCase().includes(query)

    );

  });

  const activeCount = products.filter(

    (product) => product.active === true

  ).length;

  const lowStockCount = products.filter(

    (product) =>

      product.active === true && Number(product.stock) <= 5

  ).length;

  const deliveredCount = orders.filter(

    (order) => order.orderStatus === "DELIVERED"

  ).length;

  const filteredProducts = products.filter((product) => {

    const query = search.trim().toLowerCase();

    const matchesSearch =

      String(product.name || "").toLowerCase().includes(query) ||

      String(product.sku || "").toLowerCase().includes(query) ||

      String(product.category || "").toLowerCase().includes(query);

    const matchesFilter =

      productFilter === "LOW_STOCK"

        ? product.active === true && Number(product.stock) <= 5

        : productFilter === "ACTIVE"

          ? product.active === true

          : productFilter === "INACTIVE"

            ? product.active !== true

            : true;

    return matchesSearch && matchesFilter;

  });

  const filteredOrders = orders.filter((order) => {

    const query = ordersSearch.trim().toLowerCase();

    const matchesSearch =

      String(order.orderNumber || "").toLowerCase().includes(query) ||

      String(order.customerName || "").toLowerCase().includes(query) ||

      String(order.customerEmail || "").toLowerCase().includes(query) ||
      formatOrderAddress(order).toLowerCase().includes(query) ||
      String(order.customerPhone || order.phone || "").toLowerCase().includes(query) ||
      String(order.orderStatus || "").toLowerCase().includes(query);

    const matchesFilter =

      orderFilter === "DELIVERED"

        ? order.orderStatus === "DELIVERED"

        : true;

    return matchesSearch && matchesFilter;

  });

  function updateField(event) {

    const { name, value } = event.target;

    setForm((current) => ({ ...current, [name]: value }));

  }

  function resetForm() {

    setForm(emptyProduct);

    setEditingId(null);

  }

  function editProduct(product) {

    setEditingId(product.id);

    setForm({

      sku: product.sku || "",

      name: product.name || "",

      description: product.description || "",

      category: product.category || "Women",

      price: String(product.price ?? ""),

      stock: String(product.stock ?? 0),

      imageUrl: product.imageUrl || product.image_url || "",

    });

    setMessage("");

    setError("");

    goToSection("admin-product-form");

  }

  async function handleSubmit(event) {

    event.preventDefault();

    setError("");

    setMessage("");

    if (!token) {

      setError("Please log in again.");

      return;

    }

    const price = Number(form.price);

    const stock = Number(form.stock);

    if (!Number.isFinite(price) || price <= 0) {

      setError("Price must be greater than zero.");

      return;

    }

    if (!Number.isInteger(stock) || stock < 0) {

      setError("Stock must be a whole number and cannot be negative.");

      return;

    }

    const payload = {

      sku: form.sku.trim(),

      name: form.name.trim(),

      description: form.description.trim(),

      category: form.category,

      price,

      stock,

      imageUrl: form.imageUrl.trim(),

    };

    if (!payload.sku || !payload.name || !payload.category) {

      setError("SKU, product name and category are required.");

      return;

    }

    setSaving(true);

    try {

      const response = await fetch(

        editingId ? `${API_URL}/${editingId}` : API_URL,

        {

          method: editingId ? "PUT" : "POST",

          headers: {

            ...authHeaders,

            "Content-Type": "application/json",

          },

          body: JSON.stringify(payload),

        }

      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {

        throw new Error(

          response.status === 401

            ? "Session expired. Please log in again."

            : response.status === 403

              ? "Admin permission required."

              : data.detail || data.message ||

                `Could not save product (${response.status}).`

        );

      }

      setMessage(

        editingId ? "Product updated successfully." : "Product added successfully."

      );

      resetForm();

      await loadProducts();

      onProductsChanged?.();

    } catch (err) {

      setError(err.message || "Could not save product.");

    } finally {

      setSaving(false);

    }

  }

  async function deactivateProduct(product) {

    if (!window.confirm(

      `Deactivate "${product.name}"? It will no longer appear in the customer store.`

    )) return;

    setError("");

    setMessage("");

    try {

      const response = await fetch(`${API_URL}/${product.id}`, {

        method: "DELETE",

        headers: authHeaders,

      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {

        throw new Error(

          response.status === 401

            ? "Session expired. Please log in again."

            : response.status === 403

              ? "Admin permission required."

              : data.detail || data.message ||

                `Could not deactivate product (${response.status}).`

        );

      }

      setMessage(`"${product.name}" has been deactivated.`);

      await loadProducts();

      onProductsChanged?.();

      if (String(editingId) === String(product.id)) resetForm();

    } catch (err) {

      setError(err.message || "Could not deactivate product.");

    }

  }

  async function updateOrderStatus(orderId, orderStatus) {

    setOrdersError("");

    setUpdatingOrderId(orderId);

    try {

      const response = await fetch(`${ORDERS_API_URL}/${orderId}/status`, {

        method: "PATCH",

        headers: {

          ...authHeaders,

          "Content-Type": "application/json",

        },

        body: JSON.stringify({ orderStatus }),

      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {

        throw new Error(

          response.status === 401

            ? "Session expired. Please log in again."

            : response.status === 403

              ? "Admin permission required."

              : data.detail || data.message || "Could not update delivery status."

        );

      }

      setOrders((current) =>

        current.map((order) =>

          String(order.id) === String(orderId)

            ? { ...order, orderStatus }

            : order

        )

      );

    } catch (err) {

      setOrdersError(err.message || "Could not update delivery status.");

    } finally {

      setUpdatingOrderId(null);

    }

  }

  return (

    <div className="admin-page">

      <header className="admin-header">

        <a

          className="admin-brand"

          href="#admin"

          onClick={(event) => event.preventDefault()}

        >

          MAISON<span>.</span>

          <small>STORE MANAGEMENT</small>

        </a>

        <div className="admin-header-actions">

          <span className="admin-role">ADMIN</span>

          <button
            type="button"
            className="admin-logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </header>

      <main className="admin-main">

        <section className="admin-welcome">

          <div>

            <p className="admin-eyebrow">MAISON / MANAGEMENT</p>

            <h1>Admin dashboard</h1>

            <p>Manage users, products, inventory and customer orders.</p>

          </div>

          <button

            type="button"

            className="admin-primary-button"

            onClick={() => {

              resetForm();

              setError("");

              setMessage("");

              goToSection("admin-product-form");

            }}

          >

            + Add product

          </button>

        </section>

        <section className="admin-stats">

          {clickableCard(

            "Total users",

            usersLoading ? "..." : totalUsers === null ? "â€”" : totalUsers,

            "Registered customer accounts",

            () => goToSection("admin-users-section")

          )}

          {clickableCard(

            "Total products",

            loading ? "..." : products.length,

            "Including inactive products",

            () => {

              setProductFilter("ALL");

              goToSection("admin-products-section");

            }

          )}

          {clickableCard(

            "Active products",

            loading ? "..." : activeCount,

            "Visible in the customer store",

            () => {

              setProductFilter("ACTIVE");

              goToSection("admin-products-section");

            }

          )}
{clickableCard(
  "Total revenue",
  revenueLoading
    ? "..."
    : totalRevenue === null
      ? "â€”"
      : money(totalRevenue),
  "Successful payments Â· excluding cancelled orders",
  () => goToSection("admin-orders-section")
)}
          {clickableCard(

            "Low stock",

            loading ? "..." : lowStockCount,

            "5 units or fewer",

            () => {

              setProductFilter("LOW_STOCK");

              goToSection("admin-products-section");

            }

          )}

          {clickableCard(

            "Total orders",

            ordersLoading ? "..." : ordersError && orders.length === 0 ? "â€”" : orders.length,

            "Customer orders",

            () => {

              setOrderFilter("ALL");

              goToSection("admin-orders-section");

            }

          )}

          {clickableCard(

            "Delivered orders",

            ordersLoading ? "..." : ordersError && orders.length === 0 ? "â€”" : deliveredCount,

            "Successfully delivered",

            () => {

              setOrderFilter("DELIVERED");

              goToSection("admin-orders-section");

            }

          )}

        </section>

        {usersError && (

          <div className="admin-alert admin-alert-error" role="alert">

            {usersError}

            <button type="button" className="admin-text-button" onClick={loadTotalUsers}>

              Retry

            </button>

          </div>

        )}

        {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}

        {message && <p className="admin-alert admin-alert-success" role="status">{message}</p>}

        <section className="admin-form-card" id="admin-product-form">

          <div className="admin-section-heading">

            <div>

              <p className="admin-eyebrow">{editingId ? "UPDATE COLLECTION" : "NEW ARRIVAL"}</p>

              <h2>{editingId ? "Edit product" : "Add a product"}</h2>

            </div>

            {editingId && (

              <button className="admin-text-button" type="button" onClick={resetForm}>

                Cancel edit

              </button>

            )}

          </div>

          <form className="admin-product-form" onSubmit={handleSubmit}>

            <div className="admin-field">

              <label htmlFor="admin-sku">SKU *</label>

              <input id="admin-sku" name="sku" value={form.sku} onChange={updateField} maxLength={100} required />

            </div>

            <div className="admin-field">

              <label htmlFor="admin-name">Product name *</label>

              <input id="admin-name" name="name" value={form.name} onChange={updateField} maxLength={200} required />

            </div>

            <div className="admin-field">

              <label htmlFor="admin-category">Category *</label>

              <select id="admin-category" name="category" value={form.category} onChange={updateField} required>

                {productCategories.map((item) => <option key={item} value={item}>{item}</option>)}

              </select>

            </div>

            <div className="admin-field">

              <label htmlFor="admin-price">Price (â‚¹) *</label>

              <input id="admin-price" name="price" type="number" min="0.01" step="0.01" value={form.price} onChange={updateField} required />

            </div>

            <div className="admin-field">

              <label htmlFor="admin-stock">Stock quantity *</label>

              <input id="admin-stock" name="stock" type="number" min="0" step="1" value={form.stock} onChange={updateField} required />

            </div>

            <div className="admin-field admin-field-full">

              <label htmlFor="admin-image-url">Image URL</label>

              <input id="admin-image-url" name="imageUrl" type="url" value={form.imageUrl} onChange={updateField} placeholder="https://example.com/product.jpg" />

            </div>

            <div className="admin-field admin-field-full">

              <label htmlFor="admin-description">Description</label>

              <textarea id="admin-description" name="description" value={form.description} onChange={updateField} rows={3} maxLength={5000} />

            </div>

            <div className="admin-field-full admin-form-actions">

              <button className="admin-primary-button" type="submit" disabled={saving}>

                {saving ? "Saving..." : editingId ? "Save changes" : "Create product"}

              </button>

            </div>

          </form>

        </section>

        <section className="admin-products-card admin-users-card" id="admin-users-section">

          <div className="admin-section-heading admin-products-heading">

            <div>

              <p className="admin-eyebrow">CUSTOMER MANAGEMENT</p>

              <h2>Registered users ({users.length})</h2>

            </div>

            <input

              className="admin-search"

              type="search"

              placeholder="Search name or email..."

              aria-label="Search users by name or email"

              value={userSearch}

              onChange={(event) => setUserSearch(event.target.value)}

            />

          </div>

          {usersListLoading ? (

            <p className="admin-empty">Loading users...</p>

          ) : usersListError ? (

            <p className="admin-alert admin-alert-error" role="alert">

              {usersListError}

              <button type="button" className="admin-text-button" onClick={loadUsers}>Retry</button>

            </p>

          ) : filteredUsers.length === 0 ? (

            <p className="admin-empty">No registered users found.</p>

          ) : (

            <div className="admin-table-wrapper">

              <table className="admin-table">

                <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th></tr></thead>

                <tbody>

                  {filteredUsers.map((user) => (

                    <tr key={user.id}>

                      <td>{user.id}</td>

                      <td>{user.fullName || user.full_name || "â€”"}</td>

                      <td>{user.email || "â€”"}</td>

                      <td><span className="admin-status is-active">{user.role || "CUSTOMER"}</span></td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </section>

        <section className="admin-products-card admin-orders-card" id="admin-orders-section">

          <div className="admin-section-heading admin-products-heading">

            <div>

              <p className="admin-eyebrow">ORDER MANAGEMENT</p>

              <h2>

                {orderFilter === "DELIVERED" ? "Delivered orders" : "Orders"} ({filteredOrders.length})

              </h2>

            </div>

            <div className="admin-row-actions">

              <input

                className="admin-search"

                type="search"

                placeholder="Search orders..."

                aria-label="Search orders"

                value={ordersSearch}

                onChange={(event) => setOrdersSearch(event.target.value)}

              />

              <button type="button" onClick={loadOrders}>Refresh</button>

              {orderFilter !== "ALL" && (

                <button type="button" onClick={() => setOrderFilter("ALL")}>Show all</button>

              )}

            </div>

          </div>

          {ordersError && (

            <p className="admin-alert admin-alert-error" role="alert">

              {ordersError}

              <button type="button" className="admin-text-button" onClick={loadOrders}>Retry</button>

            </p>

          )}

          {ordersLoading ? <p className="admin-empty">Loading orders...</p> :

            ordersError && orders.length === 0 ? <p className="admin-empty">Orders could not be loaded. Check the backend API.</p> :

            filteredOrders.length === 0 ? <p className="admin-empty">No orders match this filter.</p> : (

              <div className="admin-table-wrapper">

                <table className="admin-table">

                  <thead>

                    <tr><th>Order</th><th>Customer</th><th>Delivery address</th><th>Items</th><th>Total</th><th>Payment</th><th>Order date</th><th>Delivery status</th></tr>

                  </thead>

                  <tbody>

                    {filteredOrders.map((order) => (

                      <tr key={order.id}>

                        <td><strong>{order.orderNumber || `#${order.id}`}</strong></td>

                        <td>

                          <div className="admin-order-customer">

                            <strong>{order.customerName || "Customer"}</strong>

                            <small>{order.customerEmail || "Email unavailable"}</small>
                            {(order.customerPhone || order.phone) && (
                              <small>{order.customerPhone || order.phone}</small>
                            )}

                          </div>

                        </td>

                        <td>
                          <div className="admin-order-address">
                            <span>{formatOrderAddress(order)}</span>
                          </div>
                        </td>

                        <td>

                          {Array.isArray(order.items) ? order.items.reduce((total, item) => total + Number(item.quantity || 0), 0) : 0}

                        </td>

                        <td>{money(order.totalAmount)}</td>

                        <td>

                          <div className="admin-order-payment">

                            <strong>{order.paymentMethod || "â€”"}</strong>

                            <small>{order.paymentStatus || "â€”"}</small>

                          </div>

                        </td>

                        <td>{order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN") : "â€”"}</td>

                        <td>

                          <select

                            aria-label={`Delivery status for order ${order.orderNumber || order.id}`}

                            value={order.orderStatus || "PLACED"}

                            disabled={updatingOrderId === order.id}

                            onChange={(event) => updateOrderStatus(order.id, event.target.value)}

                          >

                            {DELIVERY_STATUSES.map((status) => (

                              <option key={status} value={status}>{displayStatus(status)}</option>

                            ))}

                          </select>

                          {updatingOrderId === order.id && <small>Saving...</small>}

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

        </section>

        <section className="admin-products-card" id="admin-products-section">

          <div className="admin-section-heading admin-products-heading">

            <div>

              <p className="admin-eyebrow">YOUR INVENTORY</p>

              <h2>

                {productFilter === "LOW_STOCK" ? "Low-stock products" :

                 productFilter === "ACTIVE" ? "Active products" :

                 productFilter === "INACTIVE" ? "Inactive products" : "All products"}

                {" "}({filteredProducts.length})

              </h2>

            </div>

            <div className="admin-row-actions">

              <input

                className="admin-search"

                type="search"

                placeholder="Search products..."

                aria-label="Search products"

                value={search}

                onChange={(event) => setSearch(event.target.value)}

              />

              {productFilter !== "ALL" && (

                <button type="button" onClick={() => setProductFilter("ALL")}>Show all</button>

              )}

            </div>

          </div>

          {loading ? <p className="admin-empty">Loading products...</p> :

            products.length === 0 ? <p className="admin-empty">No products found in the database.</p> :

            filteredProducts.length === 0 ? <p className="admin-empty">No products match this filter.</p> : (

              <div className="admin-table-wrapper">

                <table className="admin-table">

                  <thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>

                  <tbody>

                    {filteredProducts.map((product) => (

                      <tr key={product.id}>

                        <td>

                          <div className="admin-product-cell">

                            <img

                              src={product.imageUrl || product.image_url || "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=160&q=75"}

                              alt={product.name || "Product"}

                            />

                            <div><strong>{product.name}</strong><small>{product.category}</small></div>

                          </div>

                        </td>

                        <td>{product.sku}</td>

                        <td>{money(product.price)}</td>

                        <td>{product.stock}</td>

                        <td>

                          <span className={`admin-status ${product.active ? "is-active" : "is-inactive"}`}>

                            {product.active ? "Active" : "Inactive"}

                          </span>

                        </td>

                        <td>

                          <div className="admin-row-actions">

                            <button type="button" onClick={() => editProduct(product)}>Edit</button>

                            {product.active && (

                              <button type="button" className="admin-danger-button" onClick={() => deactivateProduct(product)}>

                                Deactivate

                              </button>

                            )}

                          </div>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

        </section>

        <p className="admin-footer-note">

          Product changes are saved to the backend database. Deactivated products are hidden from the customer storefront, not permanently deleted. Order status changes are saved through the backend API.

        </p>

      </main>

    </div>

  );

}

