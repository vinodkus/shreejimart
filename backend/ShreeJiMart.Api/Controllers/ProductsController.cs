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
        bool IsActive
    );

    public sealed record UpdateProductRequest(
        Guid CategoryId,
        string Name,
        decimal Price,
        string Unit,
        string? ImageUrl,
        bool IsActive
    );

    [HttpPost]
    public async Task<ActionResult<Product>> Create([FromBody] CreateProductRequest request, CancellationToken ct)
    {
        var validation = await ValidateAndBuildAsync(request.CategoryId, request.Name, request.Price, request.Unit, request.ImageUrl, ct);
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

        var validation = await ValidateAndBuildAsync(request.CategoryId, request.Name, request.Price, request.Unit, request.ImageUrl, ct);
        if (validation.Error is not null) return validation.Error;

        entity.CategoryId = request.CategoryId;
        entity.Name = validation.Name!;
        entity.Price = request.Price;
        entity.Unit = validation.Unit!;
        entity.ImageUrl = validation.ImageUrl;
        entity.IsActive = request.IsActive;

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

    private async Task<(ActionResult? Error, string? Name, string? Unit, string? ImageUrl)> ValidateAndBuildAsync(
        Guid categoryId,
        string? name,
        decimal price,
        string? unit,
        string? imageUrl,
        CancellationToken ct)
    {
        if (categoryId == Guid.Empty)
            return (BadRequest("CategoryId is required."), null, null, null);

        var categoryExists = await db.Categories.AnyAsync(x => x.Id == categoryId, ct);
        if (!categoryExists)
            return (BadRequest("Category does not exist."), null, null, null);

        var trimmedName = (name ?? "").Trim();
        if (trimmedName.Length is < 2 or > 160)
            return (BadRequest("Name must be 2-160 characters."), null, null, null);

        var trimmedUnit = (unit ?? "").Trim();
        if (trimmedUnit.Length is < 1 or > 32)
            return (BadRequest("Unit must be 1-32 characters."), null, null, null);

        if (price < 0)
            return (BadRequest("Price must be >= 0."), null, null, null);

        string? trimmedImageUrl = string.IsNullOrWhiteSpace(imageUrl) ? null : imageUrl.Trim();
        if (trimmedImageUrl?.Length > 500)
            return (BadRequest("Image URL max length is 500."), null, null, null);

        return (null, trimmedName, trimmedUnit, trimmedImageUrl);
    }
}
