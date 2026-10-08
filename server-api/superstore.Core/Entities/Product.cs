using System;

namespace Superstore.Core.Entities;

public class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CategoryId { get; set; }
    public Guid BrandId { get; set; }
    
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    
    // The Universal Barcode (SKU) for scanning at the POS
    public string Barcode { get; set; } = string.Empty;
    
    // Supermarkets need context: e.g., "500g", "1 Litre", "Pack of 6"
    public string UnitOfMeasure { get; set; } = string.Empty;
    
    public decimal Price { get; set; }
    
    // Instead of 1,000 InventoryUnit rows, we just use an integer.
    public int StockQuantity { get; set; }
    
    public string ImageUrl { get; set; } = string.Empty;

    public Category? Category { get; set; }
    public Brand? Brand { get; set; }
}