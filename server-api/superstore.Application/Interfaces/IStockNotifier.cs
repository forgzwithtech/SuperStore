using System;
using System.Threading.Tasks;

namespace Superstore.Application.Interfaces;

public interface IStockNotifier
{
    Task NotifyLowStockAsync(Guid productId, string productName, int currentStock);
}