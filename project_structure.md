# 📁 SuperStore - Project Structure

*Generated on: 9/30/2026, 1:07:52 PM*

## 📋 Quick Overview

| Metric | Value |
|--------|-------|
| 📄 Total Files | 86 |
| 📁 Total Folders | 47 |
| 🌳 Max Depth | 5 levels |
| 🛠️ Tech Stack | React, TypeScript, CSS, Node.js |

## ⭐ Important Files

- 🟡 🚫 **.gitignore** - Git ignore rules
- 🟡 🔒 **package-lock.json** - Dependency lock
- 🔴 📦 **package.json** - Package configuration
- 🔴 📖 **README.md** - Project documentation
- 🟡 🔷 **tsconfig.json** - TypeScript config

## 📊 File Statistics

### By File Type

- 📄 **.cs** (Other files): 33 files (38.4%)
- ⚛️ **.tsx** (React TypeScript files): 14 files (16.3%)
- ⚙️ **.json** (JSON files): 8 files (9.3%)
- 🎨 **.css** (Stylesheets): 7 files (8.1%)
- 🖼️ **.jpg** (JPEG images): 5 files (5.8%)
- 🎨 **.svg** (SVG images): 4 files (4.7%)
- 🔷 **.ts** (TypeScript files): 4 files (4.7%)
- 📄 **.csproj** (Other files): 4 files (4.7%)
- 🚫 **.gitignore** (Git ignore): 1 files (1.2%)
- 📜 **.js** (JavaScript files): 1 files (1.2%)
- 🌐 **.html** (HTML files): 1 files (1.2%)
- 📖 **.md** (Markdown files): 1 files (1.2%)
- 🖼️ **.png** (PNG images): 1 files (1.2%)
- 📄 **.http** (Other files): 1 files (1.2%)
- 📄 **.sln** (Other files): 1 files (1.2%)

### By Category

- **Other**: 39 files (45.3%)
- **React**: 14 files (16.3%)
- **Assets**: 10 files (11.6%)
- **Config**: 8 files (9.3%)
- **Styles**: 7 files (8.1%)
- **TypeScript**: 4 files (4.7%)
- **DevOps**: 1 files (1.2%)
- **JavaScript**: 1 files (1.2%)
- **Web**: 1 files (1.2%)
- **Docs**: 1 files (1.2%)

### 📁 Largest Directories

- **root**: 86 files
- **server-api**: 47 files
- **client-web**: 39 files
- **client-web\src**: 27 files
- **server-api\superstore.Api**: 26 files

## 🌳 Directory Structure

```
SuperStore/
├── 📂 client-web/
│   ├── 🟡 🚫 **.gitignore**
│   ├── 📜 eslint.config.js
│   ├── 🌐 index.html
│   ├── 🟡 🔒 **package-lock.json**
│   ├── 🔴 📦 **package.json**
│   ├── 🌐 public/
│   │   ├── 🎨 favicon.svg
│   │   └── 🎨 icons.svg
│   ├── 🔴 📖 **README.md**
│   ├── 📁 src/
│   │   ├── ⚛️ App.tsx
│   │   ├── 📦 assets/
│   │   │   ├── 🖼️ hero.png
│   │   │   ├── 🔷 mockData.ts
│   │   │   ├── 🎨 react.svg
│   │   │   └── 🎨 vite.svg
│   │   ├── 🧩 components/
│   │   │   ├── 📂 admin/
│   │   │   │   └── ⚛️ AdminDashboard.tsx
│   │   │   ├── 📂 cart/
│   │   │   │   ├── 🎨 CartFlyout.module.css
│   │   │   │   └── ⚛️ CartFlyout.tsx
│   │   │   ├── 📂 checkout/
│   │   │   │   ├── 🎨 CheckoutModal.module.css
│   │   │   │   └── ⚛️ CheckoutModal.tsx
│   │   │   ├── 📂 layout/
│   │   │   │   ├── 🎨 Navbar.module.css
│   │   │   │   └── ⚛️ Navbar.tsx
│   │   │   ├── 📂 product/
│   │   │   │   ├── 🎨 ProductOverlay.module.css
│   │   │   │   └── ⚛️ ProductOverlay.tsx
│   │   │   ├── 📂 rider/
│   │   │   │   └── ⚛️ RiderDashboard.tsx
│   │   │   ├── 📂 search/
│   │   │   │   ├── 🎨 Search.module.css
│   │   │   │   └── ⚛️ Search.tsx
│   │   │   ├── 📂 staff/
│   │   │   │   └── ⚛️ StaffDashboard.tsx
│   │   │   └── 🎨 ui/
│   │   │   │   └── ⚛️ icon.tsx
│   │   ├── 📂 context/
│   │   │   └── ⚛️ CartContext.tsx
│   │   ├── 📂 features/
│   │   │   ├── 📂 admin-dashboard/
│   │   │   ├── 📂 device-valuation/
│   │   │   ├── 📂 search/
│   │   │   └── 📂 store-inventory/
│   │   ├── 🎣 hooks/
│   │   │   └── 🔷 useInventorySync.ts
│   │   ├── 🎨 index.css
│   │   ├── ⚛️ main.tsx
│   │   ├── 📄 pages/
│   │   │   ├── 🎨 HomePage.module.css
│   │   │   ├── ⚛️ HomePage.tsx
│   │   │   └── 📂 internal/
│   │   │   │   └── ⚛️ InternalPortal.tsx
│   │   ├── 📂 services/
│   │   │   └── 🔷 api.ts
│   │   ├── 📂 store/
│   │   ├── 🎨 styles/
│   │   └── 📂 types/
│   ├── ⚙️ tsconfig.app.json
│   ├── 🟡 🔷 **tsconfig.json**
│   ├── ⚙️ tsconfig.node.json
│   └── 🔷 vite.config.ts
└── 📂 server-api/
│   ├── 📂 superstore.Api/
│   │   ├── ⚙️ appsettings.Development.json
│   │   ├── ⚙️ appsettings.json
│   │   ├── 📂 Controllers/
│   │   │   ├── 📄 AdminInventoryController.cs
│   │   │   ├── 📄 AdminOrdersController.cs
│   │   │   ├── 📄 AdminUsersController.cs
│   │   │   ├── 📄 AuthController.cs
│   │   │   ├── 📄 BrandController.cs
│   │   │   ├── 📄 CategoriesController.cs
│   │   │   ├── 📄 InventoryController.cs
│   │   │   ├── 📄 OrdersController.cs
│   │   │   └── 📄 WeatherForecastController.cs
│   │   ├── 📂 DTOs/
│   │   │   ├── 📄 AdminInventoryDTOs.cs
│   │   │   └── 📄 CheckoutRequest.cs
│   │   ├── 📂 Hubs/
│   │   │   └── 📄 InventoryHub.cs
│   │   ├── 📄 Program.cs
│   │   ├── 📂 Properties/
│   │   │   └── ⚙️ launchSettings.json
│   │   ├── 📂 Services/
│   │   │   ├── 📄 FileUploadService.cs
│   │   │   └── 📄 StockNotifier.cs
│   │   ├── 📄 superstore.Api.csproj
│   │   ├── 📄 superstore.Api.http
│   │   ├── 📄 WeatherForecast.cs
│   │   └── 📂 wwwroot/
│   │   │   └── 📂 uploads/
│   │   │   │   └── 📂 devices/
│   │   │   │   │   ├── 🖼️ 1f46d2b4-03d1-40f1-862e-d9c56e9a96f8_images (8).jpg
│   │   │   │   │   ├── 🖼️ 3a652f21-6aed-40a5-b959-b28e68aa0c88_images (9).jpg
│   │   │   │   │   ├── 🖼️ 77ceddd4-c37c-4117-a2b3-9f91e1cecab5_images (8).jpg
│   │   │   │   │   ├── 🖼️ 92376f43-3b83-48f9-94fa-04645bd63e88_images (10).jpg
│   │   │   │   │   └── 🖼️ d7f5b3c0-7e41-4277-800b-e5ad4087999b_oppox9.jpg
│   ├── 📂 superstore.Application/
│   │   ├── 📄 Class1.cs
│   │   ├── 📂 Interfaces/
│   │   │   └── 📄 IStockNotifier.cs
│   │   ├── 📂 Services/
│   │   └── 📄 superstore.Application.csproj
│   ├── 📂 superstore.Core/
│   │   ├── 📄 Class1.cs
│   │   ├── 📂 Entities/
│   │   │   ├── 📄 Category.cs
│   │   │   ├── 📄 Order.cs
│   │   │   ├── 📄 OrderItem.cs
│   │   │   ├── 📄 Product.cs
│   │   │   └── 📄 User.cs
│   │   ├── 📂 Enums/
│   │   │   ├── 📄 Brand.cs
│   │   │   └── 📄 OrderStatus.cs
│   │   └── 📄 superstore.Core.csproj
│   ├── 📂 superstore.Infrastructure/
│   │   ├── 📄 Class1.cs
│   │   ├── 📂 Data/
│   │   │   ├── 📄 DbSeeder.cs
│   │   │   └── 📄 superstoreDbContext.cs
│   │   ├── 📂 Migrations/
│   │   │   ├── 📄 20260809232918_password2.cs
│   │   │   ├── 📄 20260809232918_password2.Designer.cs
│   │   │   └── 📄 SuperstoreDbContextModelSnapshot.cs
│   │   ├── 📄 superstore.Infrastructure.csproj
│   │   └── 📂 Workers/
│   │   │   └── 📄 OrderExpirationWorker.cs
│   └── 📄 superstore.sln
```

## 📖 Legend

### File Types
- 🚫 DevOps: Git ignore
- 📜 JavaScript: JavaScript files
- 🌐 Web: HTML files
- ⚙️ Config: JSON files
- 🎨 Assets: SVG images
- 📖 Docs: Markdown files
- ⚛️ React: React TypeScript files
- 🖼️ Assets: PNG images
- 🔷 TypeScript: TypeScript files
- 🎨 Styles: Stylesheets
- 📄 Other: Other files
- 🖼️ Assets: JPEG images

### Importance Levels
- 🔴 Critical: Essential project files
- 🟡 High: Important configuration files
- 🔵 Medium: Helpful but not essential files
