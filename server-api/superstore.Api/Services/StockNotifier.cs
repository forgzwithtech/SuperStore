using Microsoft.AspNetCore.SignalR;
using Superstore.Api.Hubs;
using Superstore.Application.Interfaces;
using System;
using System.Threading.Tasks;

namespace Superstore.API.Services;

public class StockNotifier : IStockNotifier
{
    private readonly IHubContext<InventoryHub> _hubContext;

    public StockNotifier(IHubContext<InventoryHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task NotifyLowStockAsync(Guid productId, string productName, int currentStock)
    {
        // Broadcasts a real-time message to the React frontend (e.g., Admin Dashboard)
        await _hubContext.Clients.All.SendAsync("ReceiveLowStockAlert", productId, productName, currentStock);
    }
}