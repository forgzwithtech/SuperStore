using System;
using System.Collections.Generic;

namespace Superstore.Api.DTOs;

public class CheckoutRequest
{
    public required string CustomerName { get; set; }
    public required string CustomerEmail { get; set; }
    public required string CustomerPhone { get; set; }
    
    // Can be null if the customer is picking up in-store
    public string? DeliveryAddress { get; set; } 
    
    public required List<CartItemDto> Items { get; set; }
}

public class CartItemDto
{
    // We only rely on the Database ID, never frontend text
    public Guid ProductId { get; set; }
    
    // How many units of this grocery item are they buying?
    public int Quantity { get; set; }
}