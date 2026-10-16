# MAISON — Fashion Store & Real-Time Analytics Dashboard

A full-stack fashion e-commerce application with a real-time analytics dashboard, built to demonstrate modern web development, secure authentication, order management, and customer activity tracking.

## Live Applications

| Application | Link |
|---|---|
| 🛍️ MAISON Fashion Store | [Open Store](https://maison-fashion-store-one.vercel.app/) |
| 📊 Analytics Dashboard | [Open Dashboard](https://maison-fashion-store-analytics.vercel.app/) |
| ⚙️ Backend Server | [Backend API](https://maison-fashion-store-analytics.onrender.com) |
| 💻 GitHub Repository | [View Source Code](https://github.com/anjumpatel725-boop/maison-fashion-store) |

## Project Overview

**MAISON — The Everyday Edit** is a fashion e-commerce platform that enables customers to browse products, manage their shopping cart, place orders, and view order information.

The project also includes an analytics dashboard that collects customer activity events and presents key application metrics, helping demonstrate how e-commerce activity can be monitored through a centralized dashboard.

## Key Features

### Fashion Store
- Customer registration and login
- JWT-based authentication
- Product catalogue and category browsing
- Shopping cart management
- Checkout with demo UPI and card payment options
- Order placement and order tracking
- Admin dashboard for managing products, users, and orders
- Customer order and delivery information

### Real-Time Analytics Dashboard
- Overview of users, sessions, page views, and events
- Recent customer activity events
- Tracking of page views, product views, cart activity, checkout, orders, and authentication-related activity where implemented
- Periodic dashboard data refresh
- Analytics API integration
- Event history for monitoring application usage

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Java, Spring Boot, Spring WebFlux |
| API | REST APIs |
| Database | PostgreSQL |
| Database Access | R2DBC |
| Authentication | JWT |
| Data Visualization | Recharts |
| Store Deployment | Vercel |
| Analytics Dashboard Deployment | Vercel |
| Backend Deployment | Render |

## System Architecture

```text
             Customer / Administrator
                       |
             +---------+---------+
             |                   |
             v                   v
      MAISON Fashion       Analytics Dashboard
           Store                  |
             |                   |
             +---------+---------+
                       |
                 REST API Calls
                       |
                       v
              Spring Boot Backend
                       |
             +---------+----------+
             |                    |
             v                    v
       PostgreSQL DB       Activity Event API
                                  |
                                  v
                         Analytics Data
                                  |
                                  v
                         Dashboard Metrics
```

## How It Works

1. Customers register or log in to the fashion store.
2. The backend validates requests and uses JWT authentication for protected operations.
3. Customers browse products, add items to their cart, and place demo orders.
4. Relevant customer actions are sent to the activity-tracking API.
5. Activity events and application data are stored in PostgreSQL.
6. The analytics dashboard retrieves metrics and recent events from the backend.

## Local Installation and Setup

### Prerequisites

Install the following software:

- Node.js and npm
- Java JDK
- PostgreSQL
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/anjumpatel725-boop/maison-fashion-store.git
cd maison-fashion-store
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Start the Frontend

```bash
npm run dev
```

Vite will display the local development URL in the terminal.

**Note:** This GitHub repository contains the analytics frontend. The MAISON store frontend and Spring Boot backend are maintained in the broader project structure, so their local setup may require their respective project folders and configuration.

### 4. Configure the Backend

Configure the Spring Boot backend with the appropriate PostgreSQL connection settings and environment variables.

Example configuration values:

```text
Database: PostgreSQL
JWT_SECRET: Set a secure secret through an environment variable
Backend Port: 8080 (local development)
```

Do not commit database passwords, JWT secrets, API keys, or other credentials to GitHub.

### 5. Configure the Frontend API

Ensure the analytics frontend uses the correct backend API base URL for the selected environment.

- Local development: your local backend address.
- Production: the deployed backend API.

The deployed backend base URL is:

https://maison-fashion-store-analytics.onrender.com

## Example Analytics Events

| Event | Purpose |
|---|---|
| `PAGE_VIEW` | Records a page visit |
| `PRODUCT_VIEW` | Records product browsing |
| `ADD_TO_CART` | Records adding an item to the cart |
| `BUY_NOW` | Records a buy-now action |
| `CHECKOUT_STARTED` | Records checkout activity |
| `ORDER_PLACED` | Records a completed order placement |
| `LOGIN` | Records login activity where implemented |
| `LOGOUT` | Records logout activity where implemented |

## Security Considerations

- Protected API requests use JWT authentication.
- Sensitive configuration values should be provided through environment variables.
- Database access should use appropriately restricted credentials.
- Payment options are demo-only; no real payment processing is provided.
- Production deployments should use HTTPS and validate authorization for administrative operations.

## Future Enhancements

- Machine-learning-based sales and customer-behaviour predictions
- Advanced product search and filtering
- Automated alerts for unusual activity
- WebSocket-based live dashboard updates
- Mobile-friendly analytics experience
- Automated testing and CI/CD improvements

These are planned enhancements unless explicitly implemented in the current version.

## Project Purpose

This project demonstrates full-stack development using React, Java, Spring Boot, PostgreSQL, JWT, and REST APIs. It combines e-commerce workflows with customer activity tracking and analytics visualization.

## Author

**Anjum Patel**

GitHub: [anjumpatel725-boop](https://github.com/anjumpatel725-boop)

---

*Developed as a full-stack fashion e-commerce and analytics project.*
