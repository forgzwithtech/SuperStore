using Superstore.Application.Interfaces;
using Superstore.Core.Entities;
using Superstore.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization; 
using System.Linq;
using System.Threading.Tasks;

namespace Superstore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InventoryController : ControllerBase
{
    private readonly SuperstoreDbContext _dbContext;
    private readonly IStockNotifier _stockNotifier;

    public InventoryController(SuperstoreDbContext dbContext, IStockNotifier stockNotifier)
    {
        _dbContext = dbContext;
        _stockNotifier = stockNotifier;
    }

    // ─── 1. PUBLIC E-COMMERCE: GET AVAILABLE STOCK ──────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAvailableStock(
        [FromQuery] string? query,
        [FromQuery] string? brand,
        [FromQuery] string? category,
        [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice)
    {
        // 1. Build the base query (Only items that actually have stock)
        var stockQuery = _dbContext.Products
            .Include(p => p.Brand)
            .Include(p => p.Category)
            .Where(p => p.StockQuantity > 0)
            .AsQueryable();

        // 2. Apply Faceted Search filters
        if (!string.IsNullOrWhiteSpace(query))
        {
            var lowerQuery = query.ToLower();
            stockQuery = stockQuery.Where(p => 
                p.Name.ToLower().Contains(lowerQuery) || 
                p.Brand.Name.ToLower().Contains(lowerQuery));
        }

        if (!string.IsNullOrWhiteSpace(brand))
            stockQuery = stockQuery.Where(p => p.Brand.Name.ToLower() == brand.ToLower());

        if (!string.IsNullOrWhiteSpace(category))
            stockQuery = stockQuery.Where(p => p.Category.Slug.ToLower() == category.ToLower());

        if (minPrice.HasValue)
            stockQuery = stockQuery.Where(p => p.Price >= minPrice.Value);

        if (maxPrice.HasValue)
            stockQuery = stockQuery.Where(p => p.Price <= maxPrice.Value);

        // 3. Project for the frontend product cards
        var stock = await stockQuery
            .Select(p => new 
            {
                Id = p.Id,
                Brand = p.Brand.Name,
                ProductName = p.Name,
                UnitOfMeasure = p.UnitOfMeasure,
                Price = p.Price,
                Category = p.Category.Name,
                CategorySlug = p.Category.Slug,
                StockAvailable = p.StockQuantity,
                ImageUrl = p.ImageUrl
            })
            .ToListAsync();
            
        return Ok(stock);
    }

    // ─── 2. PHYSICAL POS EXCLUSIVE: GET ALL CATALOG (EVEN ZERO STOCK) ───────
    [HttpGet("pos-stock")]
    // [Authorize(Roles = "Admin, Staff")]
    public async Task<IActionResult> GetPosStock()
    {
        // Cashiers need to see everything, even if stock is 0, so they can tell walk-ins "We are out of stock"
        var stock = await _dbContext.Products
            .Include(p => p.Brand)
            .Include(p => p.Category)
            .Select(p => new 
            {
                Id = p.Id,
                Barcode = p.Barcode, // Critical for POS scanner mapping
                Brand = p.Brand.Name,
                ProductName = p.Name,
                UnitOfMeasure = p.UnitOfMeasure,
                Price = p.Price,
                StockAvailable = p.StockQuantity,
                Category = p.Category.Name
            })
            .ToListAsync();
            
        return Ok(stock);
    }

    // ─── 3. PHYSICAL POS EXCLUSIVE: RAPID BARCODE SALE ──────────────────────
    [HttpPost("pos-sell")]
    // [Authorize(Roles = "Admin, Staff")]
    public async Task<IActionResult> ProcessPosSale([FromBody] PosSaleRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Barcode) || request.Quantity <= 0)
            return BadRequest("Invalid scan data.");

        var product = await _dbContext.Products.FirstOrDefaultAsync(p => p.Barcode == request.Barcode);
        
        if (product == null) 
            return NotFound("Barcode not recognized in system.");

        if (product.StockQuantity < request.Quantity)
            return BadRequest($"Insufficient stock. Only {product.StockQuantity} left on shelves.");

        // Deduct from physical inventory instantly
        product.StockQuantity -= request.Quantity;
        
        await _dbContext.SaveChangesAsync();

        // Trigger notification if this sale drops the shelf stock to 10 or below
        if (product.StockQuantity <= 10 && _stockNotifier != null)
        {
            try { await _stockNotifier.NotifyLowStockAsync(product.Id, product.Name, product.StockQuantity); } 
            catch { /* Fire and forget, don't crash the sale if SignalR fails */ }
        }

        return Ok(new 
        { 
            Message = "Transaction Complete.",
            ProductName = product.Name,
            RemainingStock = product.StockQuantity
        });
    }
}

// ─── DTOs ───────────────────────────────────────────────────────────────
public class PosSaleRequest
{
    public required string Barcode { get; set; }
    public int Quantity { get; set; }
}