using Microsoft.EntityFrameworkCore;
using ShreeJiMart.Api.Models;

namespace ShreeJiMart.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderLine> OrderLines => Set<OrderLine>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("categories");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(120).IsRequired();
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.CategoryId).HasColumnName("category_id");
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(160).IsRequired();
            entity.Property(x => x.Price).HasColumnName("price").HasPrecision(12, 2);
            entity.Property(x => x.Unit).HasColumnName("unit").HasMaxLength(32).IsRequired();
            entity.Property(x => x.ImageUrl).HasColumnName("image_url").HasMaxLength(500);
            entity.Property(x => x.IsActive).HasColumnName("is_active");
            entity.Property(x => x.StockQuantity).HasColumnName("stock_quantity");

            entity.HasOne(x => x.Category)
                .WithMany(x => x.Products)
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("orders");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.CustomerName).HasColumnName("customer_name").HasMaxLength(120);
            entity.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(15).IsRequired();
            entity.Property(x => x.DeliveryAddress).HasColumnName("delivery_address").HasMaxLength(500).IsRequired();
            entity.Property(x => x.PaymentMethod).HasColumnName("payment_method").HasMaxLength(20).IsRequired();
            entity.Property(x => x.Status).HasColumnName("status").HasMaxLength(32).IsRequired();
            entity.Property(x => x.TotalAmount).HasColumnName("total_amount").HasPrecision(12, 2);
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");

            entity.HasMany(x => x.Lines)
                .WithOne(x => x.Order)
                .HasForeignKey(x => x.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OrderLine>(entity =>
        {
            entity.ToTable("order_lines");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.OrderId).HasColumnName("order_id");
            entity.Property(x => x.ProductId).HasColumnName("product_id");
            entity.Property(x => x.ProductName).HasColumnName("product_name").HasMaxLength(160).IsRequired();
            entity.Property(x => x.Unit).HasColumnName("unit").HasMaxLength(32).IsRequired();
            entity.Property(x => x.UnitPrice).HasColumnName("unit_price").HasPrecision(12, 2);
            entity.Property(x => x.Quantity).HasColumnName("quantity");
            entity.Property(x => x.LineTotal).HasColumnName("line_total").HasPrecision(12, 2);
        });
    }
}
