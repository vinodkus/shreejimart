namespace ShreeJiMart.Api.Models;

public sealed class Product
{
    public Guid Id { get; set; }
    public Guid CategoryId { get; set; }
    public Category? Category { get; set; }

    public string Name { get; set; } = "";
    public decimal Price { get; set; }
    public string Unit { get; set; } = "pcs";
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; } = true;
}
