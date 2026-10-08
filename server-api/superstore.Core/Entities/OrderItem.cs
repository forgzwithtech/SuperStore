using System;

namespace Superstore.Core.Entities;

public class OrderItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid OrderId { get; set; }
    public Order? Order { get; set; }

    public Guid ProductId { get; set; }
    public Product? Product { get; set; }

    // In a supermarket, you often buy multiple of the same item
    public int Quantity { get; set; }
    
    // Locked price at the time of checkout (in case milk prices go up tomorrow)
    public decimal UnitPrice { get; set; }
}