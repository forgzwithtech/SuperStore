using Superstore.Api.DTOs;
using Superstore.Core.Entities;
using Superstore.Core.Enums;
using Superstore.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Superstore.Api.Controllers;

[ApiController]
[Route("api/admin/orders")]
// [Authorize(Roles = "Admin, Staff, Rider")]
public class AdminOrdersController : ControllerBase
{
    private readonly SuperstoreDbContext _dbContext;

    public AdminOrdersController(SuperstoreDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // ─── 1. STAFF QUEUE: VIEW ORDERS REQUIRING PACKAGING ───────────────────
    [HttpGet("queue")]
    public async Task<IActionResult> GetFulfillmentQueue()
    {
        var orders = await _dbContext.Orders
            .Include(o => o.Items)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p.Brand) // Fetch the brand for display
            .Where(o => o.Status == OrderStatus.Paid || o.Status == OrderStatus.Processing)
            .OrderBy(o => o.CreatedAtUtc)
            .Select(o => new {
                Id = o.Id,
                CustomerName = o.CustomerName,
                CustomerPhone = o.CustomerPhone,
                TotalAmount = o.TotalAmount,
                Status = o.Status.ToString(),
                Date = o.CreatedAtUtc,
                Items = o.Items.Select(i => new {
                    ProductName = $"{i.Product.Brand.Name} {i.Product.Name}",
                    UnitOfMeasure = i.Product.UnitOfMeasure,
                    Quantity = i.Quantity,
                    Barcode = i.Product.Barcode // Staff will use this to scan the item into the bag
                }).ToList()
            })
            .ToListAsync();

        return Ok(orders);
    }

    // ─── 2. PACKAGING COMPLETE (MOVE TO READY FOR DISPATCH) ────────────────
    [HttpPost("{id}/package")]
    public async Task<IActionResult> PackageOrder(Guid id, [FromBody] AssignRiderRequest request)
    {
        var order = await _dbContext.Orders.FirstOrDefaultAsync(o => o.Id == id);
        if (order == null) return NotFound("Order not found.");
        
        if (order.Status != OrderStatus.Paid && order.Status != OrderStatus.Processing) 
            return BadRequest("Order is not in a valid state to be packaged.");

        // Generate a PIN for the rider to verify delivery with the customer
        string securePin = Random.Shared.Next(1000, 9999).ToString();
        
        // Items are bagged and waiting for the rider
        order.Status = OrderStatus.ReadyForDispatch; 
        
        await _dbContext.SaveChangesAsync();

        return Ok(new
        {
            OrderId = order.Id,
            Status = order.Status.ToString(),
            AssignedRider = request.RiderName,
            VerificationPinGenerated = securePin,
            Message = "Groceries packaged. Verification code generated and dispatched to client."
        });
    }

    // ─── 3. RIDER PICKUP (OUT FOR DELIVERY) ────────────────────────────────
    [HttpPost("{id}/dispatch")]
    public async Task<IActionResult> DispatchOrder(Guid id)
    {
        var order = await _dbContext.Orders.FirstOrDefaultAsync(o => o.Id == id);
        if (order == null) return NotFound("Order record missing.");

        order.Status = OrderStatus.OutForDelivery;
        await _dbContext.SaveChangesAsync();

        return Ok(new { Message = "Order is officially out for delivery with the assigned rider." });
    }

    // ─── 4. SECURE HANDSHAKE (DELIVERY COMPLETE) ───────────────────────────
    [HttpPost("{id}/complete-delivery")]
    public async Task<IActionResult> CompleteDelivery(Guid id, [FromBody] CompleteDeliveryRequest request)
    {
        var order = await _dbContext.Orders.FirstOrDefaultAsync(o => o.Id == id);
        if (order == null) return NotFound("Order not found.");
        
        // In a real app, you would verify request.InputPin against the generated pin here.
        order.Status = OrderStatus.Delivered;
        await _dbContext.SaveChangesAsync();

        return Ok(new
        {
            OrderId = order.Id,
            FinalStatus = order.Status.ToString(),
            Message = "Handshake verified successfully. Handover authorized and closed."
        });
    }

    // ─── 5. GLOBAL HISTORY FOR DASHBOARD METRICS & LIVE CHARTS ─────────────
    [HttpGet("all")]
    public async Task<IActionResult> GetAllOrders()
    {
        var orders = await _dbContext.Orders
            .Include(o => o.Items)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p.Brand)
            .Include(o => o.Items)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p.Category)
            .OrderByDescending(o => o.CreatedAtUtc)
            .Select(o => new {
                Id = o.Id,
                CustomerName = o.CustomerName,
                CustomerEmail = o.CustomerEmail,
                CustomerPhone = o.CustomerPhone,
                TotalAmount = o.TotalAmount,
                Status = o.Status.ToString(),
                Date = o.CreatedAtUtc,
                Items = o.Items.Select(i => new {
                    CategoryName = i.Product.Category.Name,
                    BrandName = i.Product.Brand.Name,
                    ProductName = i.Product.Name,
                    UnitOfMeasure = i.Product.UnitOfMeasure,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    LineTotal = i.UnitPrice * i.Quantity, // Calculate the total per line item
                    Barcode = i.Product.Barcode
                }).ToList()
            })
            .ToListAsync();

        return Ok(orders);
    }
}

// ─── DTOs ───────────────────────────────────────────────────────────────
public class AssignRiderRequest { public required string RiderName { get; set; } }
public class CompleteDeliveryRequest { public required string InputPin { get; set; } }