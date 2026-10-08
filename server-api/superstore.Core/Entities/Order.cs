using System;
using System.Collections.Generic;
using Superstore.Core.Enums;

namespace Superstore.Core.Entities;

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public string? DeliveryAddress { get; set; } 
    
    public decimal TotalAmount { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public List<OrderItem> Items { get; set; } = new();
}