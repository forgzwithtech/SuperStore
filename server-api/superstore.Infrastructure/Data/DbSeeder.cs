using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Superstore.Core.Entities;

namespace Superstore.Infrastructure.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(SuperstoreDbContext context)
    {
        // ─── 1. CATALOG SEEDING (CATEGORIES, BRANDS, PRODUCTS) ───
        if (!await context.Categories.AnyAsync())
        {
            // CATEGORIES
            var groceries = new Category { Id = Guid.NewGuid(), Name = "Groceries & Food", Slug = "groceries" };
            var electronics = new Category { Id = Guid.NewGuid(), Name = "Electronics & Appliances", Slug = "electronics" };
            var home = new Category { Id = Guid.NewGuid(), Name = "Home & Kitchen", Slug = "home-kitchen" };
            var toiletries = new Category { Id = Guid.NewGuid(), Name = "Toiletries & Beauty", Slug = "toiletries" };
            var beverages = new Category { Id = Guid.NewGuid(), Name = "Beverages & Drinks", Slug = "beverages" };
            var snacks = new Category { Id = Guid.NewGuid(), Name = "Snacks & Confectionery", Slug = "snacks" };
            
            context.Categories.AddRange(groceries, electronics, home, toiletries, beverages, snacks);

            // BRANDS
            var nestle = new Brand { Id = Guid.NewGuid(), Name = "Nestle" };
            var unilever = new Brand { Id = Guid.NewGuid(), Name = "Unilever" };
            var samsung = new Brand { Id = Guid.NewGuid(), Name = "Samsung" };
            var localFarm = new Brand { Id = Guid.NewGuid(), Name = "Local Farm Fresh" };
            var binatone = new Brand { Id = Guid.NewGuid(), Name = "Binatone" };
            var cocaCola = new Brand { Id = Guid.NewGuid(), Name = "Coca-Cola" };
            var dufil = new Brand { Id = Guid.NewGuid(), Name = "Dufil Prima" }; // Makers of Indomie
            var dangote = new Brand { Id = Guid.NewGuid(), Name = "Dangote" };
            var lg = new Brand { Id = Guid.NewGuid(), Name = "LG" };
            var pzg = new Brand { Id = Guid.NewGuid(), Name = "P&G" };

            context.Brands.AddRange(nestle, unilever, samsung, localFarm, binatone, cocaCola, dufil, dangote, lg, pzg);

            // PRODUCTS
            context.Products.AddRange(new List<Product>
            {
                // Groceries & Food
                new Product { Id = Guid.NewGuid(), CategoryId = groceries.Id, BrandId = nestle.Id, Name = "Milo Chocolate Powder", Barcode = "615110000001", UnitOfMeasure = "500g Tin", Price = 4500m, StockQuantity = 150, ImageUrl = "https://images.unsplash.com/photo-1622483767028-3f66f32aef97" },
                new Product { Id = Guid.NewGuid(), CategoryId = groceries.Id, BrandId = nestle.Id, Name = "Golden Morn Orange", Barcode = "615110000011", UnitOfMeasure = "1 Litre", Price = 1800m, StockQuantity = 85, ImageUrl = "https://images.unsplash.com/photo-1622483767028-3f66f32aef97" }, // Placeholder img
                new Product { Id = Guid.NewGuid(), CategoryId = groceries.Id, BrandId = localFarm.Id, Name = "Fresh Tomatoes", Barcode = "200000000001", UnitOfMeasure = "1 Kg Basket", Price = 3000m, StockQuantity = 50, ImageUrl = "https://images.unsplash.com/photo-1592924357228-91a4daadcfea" },
                new Product { Id = Guid.NewGuid(), CategoryId = groceries.Id, BrandId = dufil.Id, Name = "Indomie Onion Chicken", Barcode = "615110000012", UnitOfMeasure = "Carton (40 pcs)", Price = 13500m, StockQuantity = 200, ImageUrl = "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841" },
                new Product { Id = Guid.NewGuid(), CategoryId = groceries.Id, BrandId = dangote.Id, Name = "Dangote Refined Sugar", Barcode = "615110000013", UnitOfMeasure = "1 Kg Packet", Price = 1500m, StockQuantity = 300, ImageUrl = "https://images.unsplash.com/photo-1581441363689-1f3c3c41463c" },

                // Beverages
                new Product { Id = Guid.NewGuid(), CategoryId = beverages.Id, BrandId = cocaCola.Id, Name = "Coca-Cola Original", Barcode = "615110000021", UnitOfMeasure = "50cl PET", Price = 300m, StockQuantity = 500, ImageUrl = "https://images.unsplash.com/photo-1622483767028-3f66f32aef97" },
                new Product { Id = Guid.NewGuid(), CategoryId = beverages.Id, BrandId = cocaCola.Id, Name = "Eva Premium Water", Barcode = "615110000022", UnitOfMeasure = "75cl PET", Price = 250m, StockQuantity = 800, ImageUrl = "https://images.unsplash.com/photo-1523362628745-0c100150b504" },

                // Toiletries & Beauty
                new Product { Id = Guid.NewGuid(), CategoryId = toiletries.Id, BrandId = unilever.Id, Name = "CloseUp Toothpaste Red Hot", Barcode = "615110000002", UnitOfMeasure = "140g", Price = 800m, StockQuantity = 300, ImageUrl = "https://images.unsplash.com/photo-1559838096-7b8979116e0c" },
                new Product { Id = Guid.NewGuid(), CategoryId = toiletries.Id, BrandId = unilever.Id, Name = "Rexona Roll-On", Barcode = "615110000003", UnitOfMeasure = "50ml", Price = 2500m, StockQuantity = 120, ImageUrl = "https://images.unsplash.com/photo-1629198688000-71f23e745b6e" },
                new Product { Id = Guid.NewGuid(), CategoryId = toiletries.Id, BrandId = pzg.Id, Name = "Ariel Auto Washing Powder", Barcode = "615110000031", UnitOfMeasure = "2 Kg", Price = 4200m, StockQuantity = 90, ImageUrl = "https://images.unsplash.com/photo-1610555356070-d1fb336f13b2" },
                new Product { Id = Guid.NewGuid(), CategoryId = toiletries.Id, BrandId = pzg.Id, Name = "Oral-B Pro Brush", Barcode = "615110000032", UnitOfMeasure = "1 Unit", Price = 900m, StockQuantity = 150, ImageUrl = "https://images.unsplash.com/photo-1505322022379-7c3353ee6291" },

                // Electronics
                new Product { Id = Guid.NewGuid(), CategoryId = electronics.Id, BrandId = samsung.Id, Name = "Samsung 55-Inch Crystal UHD 4K TV", Barcode = "880609000001", UnitOfMeasure = "1 Unit", Price = 450000m, StockQuantity = 12, ImageUrl = "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1" },
                new Product { Id = Guid.NewGuid(), CategoryId = electronics.Id, BrandId = lg.Id, Name = "LG Double Door Refrigerator", Barcode = "880609000002", UnitOfMeasure = "260 Litres", Price = 620000m, StockQuantity = 5, ImageUrl = "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30" },
                
                // Home & Kitchen
                new Product { Id = Guid.NewGuid(), CategoryId = home.Id, BrandId = binatone.Id, Name = "Binatone Standing Fan", Barcode = "501438000001", UnitOfMeasure = "16 Inches", Price = 35000m, StockQuantity = 45, ImageUrl = "https://images.unsplash.com/photo-1618355283485-618451152bd6" },
                new Product { Id = Guid.NewGuid(), CategoryId = home.Id, BrandId = localFarm.Id, Name = "Non-Stick Frying Pan", Barcode = "200000000002", UnitOfMeasure = "24 cm", Price = 12000m, StockQuantity = 80, ImageUrl = "https://images.unsplash.com/photo-1584990347449-a6fb2629cb8c" }
            });

            await context.SaveChangesAsync();
        }

        // ─── 2. SYSTEM PERSONNEL (USERS) ───
        // Because this check is separate, it will run even if Categories already existed!
        if (!await context.Users.AnyAsync())
        {
            var hasher = new Microsoft.AspNetCore.Identity.PasswordHasher<User>();

            var adminUser = new User 
            { 
                Id = Guid.NewGuid(), 
                Username = "admin", 
                Role = "Admin", 
                FullName = "System Administrator",
                PasswordHash = "" 
            };
            adminUser.PasswordHash = hasher.HashPassword(adminUser, "123");

            var staffUser = new User 
            { 
                Id = Guid.NewGuid(), 
                Username = "cashier1", 
                Role = "Staff", 
                FullName = "Checkout Counter 1",
                PasswordHash = ""
            };
            staffUser.PasswordHash = hasher.HashPassword(staffUser, "123");

            var riderUser = new User 
            { 
                Id = Guid.NewGuid(), 
                Username = "rider1", 
                Role = "Rider", 
                FullName = "Dispatch Logistics",
                PasswordHash = ""
            };
            riderUser.PasswordHash = hasher.HashPassword(riderUser, "123");

            context.Users.AddRange(adminUser, staffUser, riderUser);
            
            await context.SaveChangesAsync();
        }
    }
}