using Superstore.Application.Interfaces;
using Superstore.Core.Enums;
using Superstore.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Superstore.Infrastructure.Workers;

public class OrderExpirationWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<OrderExpirationWorker> _logger;

    public OrderExpirationWorker(IServiceProvider serviceProvider, ILogger<OrderExpirationWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Pending Order Expiration Worker started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            await CancelExpiredPendingOrdersAsync();
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }

    private async Task CancelExpiredPendingOrdersAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SuperstoreDbContext>();
        var notifier = scope.ServiceProvider.GetRequiredService<IStockNotifier>();

        var expirationThreshold = DateTime.UtcNow.AddMinutes(-15);

        // Find pending orders older than 15 minutes that haven't been paid
        var expiredOrders = await dbContext.Orders
            .Include(o => o.Items)
                .ThenInclude(i => i.Product)
            .Where(o => o.Status == OrderStatus.Pending && o.CreatedAtUtc <= expirationThreshold)
            .ToListAsync();

        if (expiredOrders.Any())
        {
            foreach (var order in expiredOrders)
            {
                order.Status = OrderStatus.Cancelled;

                // Restore stock quantities back to the supermarket inventory
                foreach (var item in order.Items)
                {
                    if (item.Product != null)
                    {
                        item.Product.StockQuantity += item.Quantity;
                        _logger.LogInformation($"Restored {item.Quantity} units of '{item.Product.Name}' back to stock due to expired pending order {order.Id}.");

                        // Trigger low stock notification if inventory drops to 10 or fewer items
                        if (item.Product.StockQuantity <= 10)
                        {
                            await notifier.NotifyLowStockAsync(item.Product.Id, item.Product.Name, item.Product.StockQuantity);
                        }
                    }
                }
            }

            await dbContext.SaveChangesAsync();
        }
    }
}