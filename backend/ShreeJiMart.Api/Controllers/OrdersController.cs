using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShreeJiMart.Api.Data;
using ShreeJiMart.Api.Models;

namespace ShreeJiMart.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class OrdersController(AppDbContext db) : ControllerBase
{
    public sealed record OrderLineRequest(Guid ProductId, int Quantity);

    public sealed record CreateOrderRequest(
        string? CustomerName,
        string Phone,
        string DeliveryAddress,
        List<OrderLineRequest> Items
    );

    public sealed record UpdateOrderStatusRequest(string Status);

    public sealed record OrderLineDto(
        Guid Id,
        Guid ProductId,
        string ProductName,
        string Unit,
        decimal UnitPrice,
        int Quantity,
        decimal LineTotal
    );

    public sealed record OrderDto(
        Guid Id,
        string? CustomerName,
        string Phone,
        string DeliveryAddress,
        string PaymentMethod,
        string Status,
        decimal TotalAmount,
        DateTime CreatedAt,
        List<OrderLineDto> Lines
    );

    [HttpPost]
    public async Task<ActionResult<OrderDto>> Create([FromBody] CreateOrderRequest request, CancellationToken ct)
    {
        var validation = ValidateGuestOrder(request);
        if (validation.ErrorMessage is not null) return BadRequest(validation.ErrorMessage);

        var productIds = request.Items.Select(x => x.ProductId).Distinct().ToList();
        var products = await db.Products
            .Where(x => productIds.Contains(x.Id) && x.IsActive)
            .ToListAsync(ct);

        if (products.Count != productIds.Count)
            return BadRequest("One or more products are invalid or not available.");

        var productMap = products.ToDictionary(x => x.Id);
        var qtyByProduct = new Dictionary<Guid, int>();

        foreach (var item in request.Items)
        {
            if (item.Quantity < 1 || item.Quantity > 99)
                return BadRequest("Quantity must be between 1 and 99 per product.");

            qtyByProduct[item.ProductId] = qtyByProduct.GetValueOrDefault(item.ProductId) + item.Quantity;
        }

        foreach (var (productId, qtyNeeded) in qtyByProduct)
        {
            var product = productMap[productId];
            if (product.StockQuantity < qtyNeeded)
                return BadRequest($"Not enough stock for {product.Name}. Only {product.StockQuantity} left.");
        }

        var lines = new List<OrderLine>();
        decimal total = 0;

        foreach (var item in request.Items)
        {
            var product = productMap[item.ProductId];
            var lineTotal = product.Price * item.Quantity;
            total += lineTotal;

            lines.Add(new OrderLine
            {
                Id = Guid.NewGuid(),
                ProductId = product.Id,
                ProductName = product.Name,
                Unit = product.Unit,
                UnitPrice = product.Price,
                Quantity = item.Quantity,
                LineTotal = lineTotal,
            });
        }

        if (total <= 0)
            return BadRequest("Order total must be greater than zero.");

        Customer? linkedCustomer = null;
        var customerId = GetCustomerIdFromUser();
        if (customerId is not null)
            linkedCustomer = await db.Customers.FirstOrDefaultAsync(x => x.Id == customerId, ct);

        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        foreach (var (productId, qtyNeeded) in qtyByProduct)
            productMap[productId].StockQuantity -= qtyNeeded;

        var order = new Order
        {
            Id = Guid.NewGuid(),
            CustomerId = linkedCustomer?.Id,
            CustomerName = validation.CustomerName ?? linkedCustomer?.DisplayName,
            Phone = validation.Phone!,
            DeliveryAddress = validation.DeliveryAddress!,
            PaymentMethod = "COD",
            Status = OrderStatus.Pending,
            TotalAmount = total,
            CreatedAt = DateTime.UtcNow,
            Lines = lines,
        };

        if (linkedCustomer is not null)
        {
            linkedCustomer.Phone = validation.Phone!;
            linkedCustomer.DefaultAddress = validation.DeliveryAddress!;
            if (!string.IsNullOrWhiteSpace(validation.CustomerName))
                linkedCustomer.DisplayName = validation.CustomerName;
        }

        foreach (var line in lines)
            line.OrderId = order.Id;

        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = order.Id }, ToDto(order));
    }

    [HttpGet]
    public async Task<ActionResult<List<OrderDto>>> GetAll(CancellationToken ct)
    {
        var orders = await db.Orders
            .AsNoTracking()
            .Include(x => x.Lines)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);

        return Ok(orders.Select(ToDto).ToList());
    }

    [Authorize(Roles = "Customer")]
    [HttpGet("mine")]
    public async Task<ActionResult<List<OrderDto>>> GetMine(CancellationToken ct)
    {
        var customerId = GetCustomerIdFromUser();
        if (customerId is null) return Unauthorized();

        var orders = await db.Orders
            .AsNoTracking()
            .Include(x => x.Lines)
            .Where(x => x.CustomerId == customerId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);

        return Ok(orders.Select(ToDto).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderDto>> GetById(Guid id, CancellationToken ct)
    {
        var order = await db.Orders
            .AsNoTracking()
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        return order is null ? NotFound() : Ok(ToDto(order));
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<OrderDto>> UpdateStatus(Guid id, [FromBody] UpdateOrderStatusRequest request, CancellationToken ct)
    {
        var status = (request.Status ?? "").Trim();
        if (!OrderStatus.All.Contains(status))
            return BadRequest($"Status must be one of: {string.Join(", ", OrderStatus.All)}.");

        var order = await db.Orders
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (order is null) return NotFound();

        var previousStatus = order.Status;

        if (status == OrderStatus.Cancelled && previousStatus != OrderStatus.Cancelled)
            await RestoreStockAsync(order, ct);

        order.Status = status;
        await db.SaveChangesAsync(ct);

        return Ok(ToDto(order));
    }

    private async Task RestoreStockAsync(Order order, CancellationToken ct)
    {
        var productIds = order.Lines.Select(x => x.ProductId).Distinct().ToList();
        var products = await db.Products
            .Where(x => productIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, ct);

        foreach (var line in order.Lines)
        {
            if (products.TryGetValue(line.ProductId, out var product))
                product.StockQuantity += line.Quantity;
        }
    }

    private static OrderDto ToDto(Order order) =>
        new(
            order.Id,
            order.CustomerName,
            order.Phone,
            order.DeliveryAddress,
            order.PaymentMethod,
            order.Status,
            order.TotalAmount,
            order.CreatedAt,
            order.Lines
                .OrderBy(x => x.ProductName)
                .Select(x => new OrderLineDto(
                    x.Id,
                    x.ProductId,
                    x.ProductName,
                    x.Unit,
                    x.UnitPrice,
                    x.Quantity,
                    x.LineTotal))
                .ToList());

    private static (string? ErrorMessage, string? CustomerName, string? Phone, string? DeliveryAddress) ValidateGuestOrder(
        CreateOrderRequest request)
    {
        if (request.Items is null || request.Items.Count == 0)
            return ("At least one item is required.", null, null, null);

        var phone = NormalizePhone(request.Phone);
        if (phone is null)
            return ("Phone must be a valid 10-digit Indian mobile number.", null, null, null);

        var address = (request.DeliveryAddress ?? "").Trim();
        if (address.Length is < 10 or > 500)
            return ("Delivery address must be 10-500 characters.", null, null, null);

        string? name = string.IsNullOrWhiteSpace(request.CustomerName)
            ? null
            : request.CustomerName.Trim();

        if (name?.Length > 120)
            return ("Customer name max length is 120.", null, null, null);

        return (null, name, phone, address);
    }

    private Guid? GetCustomerIdFromUser()
    {
        if (User.Identity?.IsAuthenticated != true || !User.IsInRole("Customer"))
            return null;

        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        return Guid.TryParse(sub, out var customerId) ? customerId : null;
    }

    private static string? NormalizePhone(string? phone)
    {
        var digits = new string((phone ?? "").Where(char.IsDigit).ToArray());
        if (digits.Length == 12 && digits.StartsWith("91", StringComparison.Ordinal))
            digits = digits[2..];
        if (digits.Length != 10 || digits[0] is < '6' or > '9')
            return null;
        return digits;
    }
}
