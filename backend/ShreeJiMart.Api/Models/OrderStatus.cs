namespace ShreeJiMart.Api.Models;

public static class OrderStatus
{
    public const string Pending = "Pending";
    public const string Confirmed = "Confirmed";
    public const string OutForDelivery = "OutForDelivery";
    public const string Delivered = "Delivered";
    public const string Cancelled = "Cancelled";

    public static readonly HashSet<string> All =
    [
        Pending,
        Confirmed,
        OutForDelivery,
        Delivered,
        Cancelled,
    ];
}
