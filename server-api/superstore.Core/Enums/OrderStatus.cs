namespace Superstore.Core.Enums;

public enum OrderStatus
{
    // Frontend States
    Pending,          // Cart submitted, stock reserved, waiting for payment
    Paid,             // Payment successful, ready for picking
    Cancelled,        // Payment failed or order voided

    // Staff/Logistics States
    Processing,       // Staff is walking the aisles putting items in bags
    ReadyForDispatch, // Bags are packed and waiting for a rider/customer pickup
    OutForDelivery,   // Rider is on the way
    Delivered         // Handshake complete
}