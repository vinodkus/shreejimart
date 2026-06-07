using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShreeJiMart.Api.Data;
using ShreeJiMart.Api.Models;

namespace ShreeJiMart.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ProductsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<Product>>> GetAll([FromQuery] Guid? categoryId, CancellationToken ct)
    {
        var query = db.Products.AsNoTracking().OrderBy(x => x.Name).AsQueryable();

        if (categoryId is not null && categoryId != Guid.Empty)
            query = query.Where(x => x.CategoryId == categoryId);

        return Ok(await query.ToListAsync(ct));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Product>> GetById(Guid id, CancellationToken ct)
    {
        var product = await db.Products.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return product is null ? NotFound() : Ok(product);
    }

    public sealed record CreateProductRequest(
        Guid CategoryId,
        string Name,
        decimal Price,
        string Unit,
        string? ImageUrl,
        bool IsActive,
        int StockQuantity
    );

    public sealed record UpdateProductRequest(
        Guid CategoryId,
        string Name,
        decimal Price,
        string Unit,
        string? ImageUrl,
        bool IsActive,
        int StockQuantity
    );

    public sealed record BulkProductItemRequest(
        string Name,
        decimal Price,
        string Unit,
        string? ImageUrl,
        bool IsActive,
        int StockQuantity
    );

    public sealed record BulkCreateProductsRequest(
        Guid CategoryId,
        List<BulkProductItemRequest> Items
    );

    [HttpPost("bulk")]
    public async Task<ActionResult<List<Product>>> BulkCreate(
        [FromBody] BulkCreateProductsRequest request,
        CancellationToken ct)
    {
        if (request.Items is null || request.Items.Count == 0)
            return BadRequest("At least one product is required.");

        if (request.Items.Count > 50)
            return BadRequest("Maximum 50 products per bulk request.");

        if (request.CategoryId == Guid.Empty)
            return BadRequest("CategoryId is required.");

        var categoryExists = await db.Categories.AnyAsync(x => x.Id == request.CategoryId, ct);
        if (!categoryExists)
            return BadRequest("Category does not exist.");

        var entities = new List<Product>();

        for (var i = 0; i < request.Items.Count; i++)
        {
            var item = request.Items[i];
            var validation = await ValidateAndBuildAsync(
                request.CategoryId,
                item.Name,
                item.Price,
                item.Unit,
                item.ImageUrl,
                item.StockQuantity,
                ct);

            if (validation.Error is not null)
                return BadRequest($"Row {i + 1}: check name, unit, price, and stock.");

            entities.Add(new Product
            {
                Id = Guid.NewGuid(),
                CategoryId = request.CategoryId,
                Name = validation.Name!,
                Price = item.Price,
                Unit = validation.Unit!,
                ImageUrl = validation.ImageUrl,
                IsActive = item.IsActive,
                StockQuantity = validation.StockQuantity,
            });
        }

        db.Products.AddRange(entities);
        await db.SaveChangesAsync(ct);

        return Ok(entities);
    }

    [HttpPost]
    public async Task<ActionResult<Product>> Create([FromBody] CreateProductRequest request, CancellationToken ct)
    {
        var validation = await ValidateAndBuildAsync(
            request.CategoryId,
            request.Name,
            request.Price,
            request.Unit,
            request.ImageUrl,
            request.StockQuantity,
            ct);
        if (validation.Error is not null) return validation.Error;

        var entity = new Product
        {
            Id = Guid.NewGuid(),
            CategoryId = request.CategoryId,
            Name = validation.Name!,
            Price = request.Price,
            Unit = validation.Unit!,
            ImageUrl = validation.ImageUrl,
            IsActive = request.IsActive,
            StockQuantity = validation.StockQuantity,
        };

        db.Products.Add(entity);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, entity);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<Product>> Update(Guid id, [FromBody] UpdateProductRequest request, CancellationToken ct)
    {
        var entity = await db.Products.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return NotFound();

        var validation = await ValidateAndBuildAsync(
            request.CategoryId,
            request.Name,
            request.Price,
            request.Unit,
            request.ImageUrl,
            request.StockQuantity,
            ct);
        if (validation.Error is not null) return validation.Error;

        entity.CategoryId = request.CategoryId;
        entity.Name = validation.Name!;
        entity.Price = request.Price;
        entity.Unit = validation.Unit!;
        entity.ImageUrl = validation.ImageUrl;
        entity.IsActive = request.IsActive;
        entity.StockQuantity = validation.StockQuantity;

        await db.SaveChangesAsync(ct);
        return Ok(entity);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await db.Products.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return NotFound();

        db.Products.Remove(entity);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task<(ActionResult? Error, string? Name, string? Unit, string? ImageUrl, int StockQuantity)> ValidateAndBuildAsync(
        Guid categoryId,
        string? name,
        decimal price,
        string? unit,
        string? imageUrl,
        int stockQuantity,
        CancellationToken ct)
    {
        if (categoryId == Guid.Empty)
            return (BadRequest("CategoryId is required."), null, null, null, 0);

        var categoryExists = await db.Categories.AnyAsync(x => x.Id == categoryId, ct);
        if (!categoryExists)
            return (BadRequest("Category does not exist."), null, null, null, 0);

        var trimmedName = (name ?? "").Trim();
        if (trimmedName.Length is < 2 or > 160)
            return (BadRequest("Name must be 2-160 characters."), null, null, null, 0);

        var trimmedUnit = (unit ?? "").Trim();
        if (trimmedUnit.Length is < 1 or > 32)
            return (BadRequest("Unit must be 1-32 characters."), null, null, null, 0);

        if (price < 0)
            return (BadRequest("Price must be >= 0."), null, null, null, 0);

        if (stockQuantity < 0)
            return (BadRequest("Stock must be >= 0."), null, null, null, 0);

        string? trimmedImageUrl = string.IsNullOrWhiteSpace(imageUrl) ? null : imageUrl.Trim();
        if (trimmedImageUrl?.Length > 500)
            return (BadRequest("Image URL max length is 500."), null, null, null, 0);

        return (null, trimmedName, trimmedUnit, trimmedImageUrl, stockQuantity);
    }
}
