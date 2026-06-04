namespace ShreeJiMart.Api.Models;

public sealed class Order
{
    public Guid Id { get; set; }
    public string? CustomerName { get; set; }
    public string Phone { get; set; } = "";
    public string DeliveryAddress { get; set; } = "";
    public string PaymentMethod { get; set; } = "COD";
    public string Status { get; set; } = OrderStatus.Pending;
    public decimal TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<OrderLine> Lines { get; set; } = [];
}
