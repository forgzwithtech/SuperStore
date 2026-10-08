using System;
using System.Collections.Generic;

namespace Superstore.Core.Entities;

public class Brand
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    
    public ICollection<Product> Products { get; set; } = new List<Product>();
}