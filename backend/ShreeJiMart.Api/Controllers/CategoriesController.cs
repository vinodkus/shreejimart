using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShreeJiMart.Api.Data;
using ShreeJiMart.Api.Models;

namespace ShreeJiMart.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class CategoriesController(AppDbContext db) : ControllerBase
{
    public sealed record CategoryResponse(
        Guid Id,
        string Name,
        Guid? ParentId,
        string? ParentName,
        string? ImageUrl);

    [HttpGet]
    public async Task<ActionResult<List<CategoryResponse>>> GetAll(CancellationToken ct)
    {
        var items = await db.Categories
            .AsNoTracking()
            .Include(x => x.Parent)
            .OrderBy(x => x.ParentId == null ? 0 : 1)
            .ThenBy(x => x.Parent != null ? x.Parent.Name : x.Name)
            .ThenBy(x => x.Name)
            .Select(x => new CategoryResponse(
                x.Id,
                x.Name,
                x.ParentId,
                x.Parent != null ? x.Parent.Name : null,
                x.ImageUrl))
            .ToListAsync(ct);

        return Ok(items);
    }

    public sealed record CreateCategoryRequest(string Name, Guid? ParentId, string? ImageUrl);

    public sealed record UpdateCategoryRequest(string Name, Guid? ParentId, string? ImageUrl);

    [HttpPost]
    public async Task<ActionResult<CategoryResponse>> Create([FromBody] CreateCategoryRequest request, CancellationToken ct)
    {
        var validation = ValidateName(request.Name);
        if (validation.ErrorMessage is not null) return BadRequest(validation.ErrorMessage);

        var imageError = ValidateImageUrl(request.ImageUrl);
        if (imageError is not null) return BadRequest(imageError);

        var parentError = await ValidateParentAsync(request.ParentId, null, ct);
        if (parentError is not null) return BadRequest(parentError);

        var entity = new Category
        {
            Id = Guid.NewGuid(),
            Name = validation.Name!,
            ParentId = request.ParentId == Guid.Empty ? null : request.ParentId,
            ImageUrl = NormalizeImageUrl(request.ImageUrl),
        };

        db.Categories.Add(entity);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetAll), new { id = entity.Id }, await ToResponseAsync(entity.Id, ct));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CategoryResponse>> Update(Guid id, [FromBody] UpdateCategoryRequest request, CancellationToken ct)
    {
        var entity = await db.Categories.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return NotFound();

        var validation = ValidateName(request.Name);
        if (validation.ErrorMessage is not null) return BadRequest(validation.ErrorMessage);

        var imageError = ValidateImageUrl(request.ImageUrl);
        if (imageError is not null) return BadRequest(imageError);

        var parentId = request.ParentId == Guid.Empty ? null : request.ParentId;
        var parentError = await ValidateParentAsync(parentId, id, ct);
        if (parentError is not null) return BadRequest(parentError);

        entity.Name = validation.Name!;
        entity.ParentId = parentId;
        entity.ImageUrl = NormalizeImageUrl(request.ImageUrl);
        await db.SaveChangesAsync(ct);

        return Ok(await ToResponseAsync(entity.Id, ct));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await db.Categories.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return NotFound();

        var hasChildren = await db.Categories.AnyAsync(x => x.ParentId == id, ct);
        if (hasChildren)
            return BadRequest("Cannot delete a category that has subcategories. Delete or move subcategories first.");

        var hasProducts = await db.Products.AnyAsync(x => x.CategoryId == id, ct);
        if (hasProducts)
            return BadRequest("Cannot delete a category that has products. Remove or reassign those products first.");

        db.Categories.Remove(entity);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task<CategoryResponse> ToResponseAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.Categories
            .AsNoTracking()
            .Include(x => x.Parent)
            .FirstAsync(x => x.Id == id, ct);

        return new CategoryResponse(
            entity.Id,
            entity.Name,
            entity.ParentId,
            entity.Parent?.Name,
            entity.ImageUrl);
    }

    private async Task<string?> ValidateParentAsync(Guid? parentId, Guid? categoryId, CancellationToken ct)
    {
        if (parentId is null || parentId == Guid.Empty)
            return null;

        if (categoryId is not null && parentId == categoryId)
            return "A category cannot be its own parent.";

        var parent = await db.Categories.AsNoTracking().FirstOrDefaultAsync(x => x.Id == parentId, ct);
        if (parent is null)
            return "Parent category does not exist.";

        if (parent.ParentId is not null)
            return "Subcategories can only be created under a top-level category.";

        if (categoryId is not null)
        {
            var hasChildren = await db.Categories.AnyAsync(x => x.ParentId == categoryId, ct);
            if (hasChildren)
                return "Cannot move a parent category under another category. Move or delete its subcategories first.";

            if (await db.Categories.AnyAsync(x => x.ParentId == categoryId && x.Id == parentId, ct))
                return "A category cannot be moved under its own subcategory.";
        }

        return null;
    }

    private static (string? ErrorMessage, string? Name) ValidateName(string? name)
    {
        var trimmed = (name ?? "").Trim();
        if (trimmed.Length is < 2 or > 120)
            return ("Name must be 2-120 characters.", null);

        return (null, trimmed);
    }

    private static string? ValidateImageUrl(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return null;

        var trimmed = imageUrl.Trim();
        return trimmed.Length > 500 ? "Image URL max length is 500." : null;
    }

    private static string? NormalizeImageUrl(string? imageUrl) =>
        string.IsNullOrWhiteSpace(imageUrl) ? null : imageUrl.Trim();
}
