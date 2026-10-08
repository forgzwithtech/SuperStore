using Superstore.Api.DTOs;
using Superstore.API.Services;
using Superstore.Core.Entities;
using Superstore.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;
using System.Linq;

namespace Superstore.Api.Controllers;

[ApiController]
[Route("api/admin/inventory")]
// [Authorize(Roles = "Admin, Staff")] 
public class AdminInventoryController : ControllerBase
{
    private readonly SuperstoreDbContext _dbContext;
    private readonly FileUploadService _fileUploadService;

    public AdminInventoryController(SuperstoreDbContext dbContext, FileUploadService fileUploadService)
    {
        _dbContext = dbContext;
        _fileUploadService = fileUploadService;
    }

    // ─── 1. CREATE SUPERMARKET PRODUCT ──────────────────────────────────────────
    [HttpPost("create-product")]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductRequest request)
    {
        var barcodeExists = await _dbContext.Products.AnyAsync(p => p.Barcode == request.Barcode);
        if (barcodeExists) 
            return Conflict(new { Message = $"A product with barcode {request.Barcode} already exists." });

        var category = await _dbContext.Categories.FirstOrDefaultAsync(c => c.Name.ToLower() == request.CategoryName.ToLower());
        if (category == null)
        {
            category = new Category 
            { 
                Id = Guid.NewGuid(), 
                Name = request.CategoryName, 
                Slug = request.CategoryName.ToLower().Replace(" ", "-") 
            };
            _dbContext.Categories.Add(category);
        }

        var brand = await _dbContext.Brands.FirstOrDefaultAsync(b => b.Name.ToLower() == request.BrandName.ToLower());
        if (brand == null)
        {
            brand = new Brand { Id = Guid.NewGuid(), Name = request.BrandName };
            _dbContext.Brands.Add(brand);
        }

        var newProduct = new Product
        {
            Id = Guid.NewGuid(),
            CategoryId = category.Id,
            BrandId = brand.Id,
            Name = request.ProductName.Trim(),
            Description = request.Description?.Trim() ?? "",
            Barcode = request.Barcode.Trim(),
            UnitOfMeasure = request.UnitOfMeasure.Trim(),
            Price = request.Price,
            StockQuantity = request.InitialStock,
            ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) 
                ? "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000" 
                : request.ImageUrl
        };

        _dbContext.Products.Add(newProduct);
        await _dbContext.SaveChangesAsync();

        return Ok(new 
        { 
            ProductId = newProduct.Id, 
            Message = $"Successfully created {brand.Name} {newProduct.Name} ({newProduct.UnitOfMeasure}). Initial stock: {newProduct.StockQuantity}" 
        });
    }

    // ─── 2. QUICK ADD STOCK (SUPERMARKET INVENTORY REPLENISHMENT) ─────────────
    [HttpPost("add-stock")]
    public async Task<IActionResult> AddStock([FromBody] AddStockRequest request)
    {
        if (request.QuantityToAdd <= 0) 
            return BadRequest("Quantity to add must be greater than zero.");

        var product = await _dbContext.Products.FirstOrDefaultAsync(p => p.Id == request.ProductId);
        if (product == null) 
            return NotFound("The specified product does not exist.");

        product.StockQuantity += request.QuantityToAdd;
        
        await _dbContext.SaveChangesAsync();

        return Ok(new 
        { 
            NewTotalStock = product.StockQuantity, 
            Message = $"Successfully added {request.QuantityToAdd} units. Total stock for {product.Name} is now {product.StockQuantity}." 
        });
    }

    // ─── 3. GET ALL PRODUCTS FOR ADMIN DASHBOARD ──────────────────────────────
    [HttpGet("products")]
    public async Task<IActionResult> GetAllProducts()
    {
        // STEP 1: Fetch the raw data from the database to memory first
        var rawProducts = await _dbContext.Products
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .ToListAsync(); // <-- This executes the SQL query

        // STEP 2: Format strings and sort in memory using C# 
        var products = rawProducts
            .Select(p => new 
            {
                Id = p.Id,
                DisplayName = $"{(p.Brand != null ? p.Brand.Name : "Unknown")} {p.Name} | {p.UnitOfMeasure}",
                Barcode = p.Barcode,
                Price = p.Price,
                StockAvailable = p.StockQuantity,
                Category = p.Category != null ? p.Category.Name : "Uncategorized",
                ImageUrl = p.ImageUrl
            })
            .OrderBy(p => p.Category)
            .ThenBy(p => p.DisplayName)
            .ToList();

        return Ok(products);
    }

    // ─── 4. UPLOAD PRODUCT IMAGES ─────────────────────────────────────────────
    [HttpPost("upload-image")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("No file provided.");

        try
        {
            var relativePath = await _fileUploadService.UploadDeviceImageAsync(file);
            return Ok(new { Url = relativePath, Message = "Image successfully saved to local wwwroot." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error during upload: {ex.Message}");
        }
    }
}