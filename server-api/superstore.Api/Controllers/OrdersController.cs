using Superstore.Api.DTOs;
using Superstore.Application.Interfaces;
using Superstore.Core.Entities;
using Superstore.Core.Enums;
using Superstore.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Superstore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly SuperstoreDbContext _dbContext;
    private readonly IStockNotifier _stockNotifier;

    public OrdersController(SuperstoreDbContext dbContext, IStockNotifier stockNotifier)
    {
        _dbContext = dbContext;
        _stockNotifier = stockNotifier;
    }

    // ─── 1. SECURE CHECKOUT (CART RESERVATION) ──────────────────────────────
    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout([FromBody] CheckoutRequest request)
    {
        if (request == null || !request.Items.Any()) 
            return BadRequest("Your cart cannot be empty.");

        // We use a transaction because if one item in the cart is out of stock, 
        // we must rollback everything. Partial checkouts are bad UX.
        using var transaction = await _dbContext.Database.BeginTransactionAsync();

        try
        {
            decimal orderTotal = 0;
            var orderItems = new List<OrderItem>();
            var productsToUpdate = new List<Product>();

            foreach (var cartItem in request.Items)
            {
                // High-speed direct ID lookup (No text matching!)
                var product = await _dbContext.Products.FirstOrDefaultAsync(p => p.Id == cartItem.ProductId);

                if (product == null)
                {
                    await transaction.RollbackAsync();
                    return NotFound(new { Error = "One or more products in your cart no longer exist in our catalog." });
                }

                if (product.StockQuantity < cartItem.Quantity)
                {
                    await transaction.RollbackAsync();
                    return Conflict(new { 
                        Error = $"Not enough stock for {product.Name}. Requested: {cartItem.Quantity}, Available: {product.StockQuantity}" 
                    });
                }

                // 1. Deduct the stock immediately
                product.StockQuantity -= cartItem.Quantity;
                productsToUpdate.Add(product); // Keep track for low-stock alerts

                // 2. Lock in the current price and calculate total
                orderTotal += (product.Price * cartItem.Quantity);

                // 3. Prepare the line item
                orderItems.Add(new OrderItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = product.Id,
                    Quantity = cartItem.Quantity,
                    UnitPrice = product.Price // Lock the price so tomorrow's inflation doesn't change it
                });
            }

            // 4. Generate the Master Order
            var order = new Order
            {
                Id = Guid.NewGuid(),
                CustomerName = request.CustomerName.Trim(),
                CustomerEmail = request.CustomerEmail.Trim().ToLower(),
                CustomerPhone = request.CustomerPhone.Trim(),
                DeliveryAddress = request.DeliveryAddress?.Trim(),
                TotalAmount = orderTotal,
                Status = OrderStatus.Pending, // Awaiting payment
                CreatedAtUtc = DateTime.UtcNow,
                Items = orderItems
            };

            _dbContext.Orders.Add(order);
            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();

            // 5. Fire background notifications for low stock
            foreach (var p in productsToUpdate.Where(p => p.StockQuantity <= 10))
            {
                try { await _stockNotifier.NotifyLowStockAsync(p.Id, p.Name, p.StockQuantity); } 
                catch { /* Fire & Forget */ }
            }

            return Ok(new
            {
                OrderId = order.Id,
                TotalAmount = order.TotalAmount,
                Message = "Inventory successfully reserved. Awaiting payment."
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { Error = "An unexpected error occurred during checkout.", Details = ex.Message });
        }
    }

    // ─── 2. PAYMENT GATEWAY SIMULATION ──────────────────────────────────────
    [HttpPost("{id}/mock-pay")]
    public async Task<IActionResult> MockPaymentSimulation(Guid id)
    {
        var order = await _dbContext.Orders.FirstOrDefaultAsync(o => o.Id == id);

        if (order == null) return NotFound("Order receipt registry not found.");
        
        if (order.Status != OrderStatus.Pending) 
            return BadRequest($"This order cannot be paid for because it is currently: {order.Status}");

        // For a supermarket, payment is simple. The stock was already deducted.
        // We just move the order from "Pending" to "Paid", which immediately drops it 
        // into the AdminOrdersController queue for the staff to start bagging.
        order.Status = OrderStatus.Paid;
        
        await _dbContext.SaveChangesAsync();

        return Ok(new 
        { 
            OrderId = order.Id,
            Message = "Payment captured. Order sent to fulfillment queue." 
        });
    }
}