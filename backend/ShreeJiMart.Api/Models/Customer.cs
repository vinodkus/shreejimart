namespace ShreeJiMart.Api.Models;

public static class CustomerAuthProvider
{
    public const string Google = "google";
    public const string Guest = "guest";
}

public sealed class Customer
{
    public Guid Id { get; set; }
    public string AuthProvider { get; set; } = CustomerAuthProvider.Guest;
    public string? GoogleSub { get; set; }
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
    public string? Phone { get; set; }
    public string? DefaultAddress { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }

    public ICollection<Order> Orders { get; set; } = [];
}
