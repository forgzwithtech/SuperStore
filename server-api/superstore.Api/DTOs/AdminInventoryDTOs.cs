using System;
using System.Collections.Generic;

namespace Superstore.Api.DTOs;

public class CreateProductRequest
{
    public required string CategoryName { get; set; }
    public required string BrandName { get; set; }
    public required string ProductName { get; set; }
    public string Description { get; set; } = string.Empty;
    
    public required string Barcode { get; set; }
    
    // e.g., "500g", "1 Litre", "Pack of 6"
    public required string UnitOfMeasure { get; set; }
    
    public decimal Price { get; set; }
    public int InitialStock { get; set; }
    
    public string? ImageUrl { get; set; }
}

public class AddStockRequest
{
    public Guid ProductId { get; set; }
    
    // In a supermarket, you just add numbers to existing stock
    public int QuantityToAdd { get; set; }
}
