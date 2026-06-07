using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShreeJiMart.Api.Data;
using ShreeJiMart.Api.Models;

namespace ShreeJiMart.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class CategoriesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<Category>>> GetAll(CancellationToken ct)
    {
        var items = await db.Categories
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .ToListAsync(ct);

        return Ok(items);
    }

    public sealed record CreateCategoryRequest(string Name);

    public sealed record UpdateCategoryRequest(string Name);

    [HttpPost]
    public async Task<ActionResult<Category>> Create([FromBody] CreateCategoryRequest request, CancellationToken ct)
    {
        var validation = ValidateName(request.Name);
        if (validation.ErrorMessage is not null) return BadRequest(validation.ErrorMessage);

        var entity = new Category { Id = Guid.NewGuid(), Name = validation.Name! };
        db.Categories.Add(entity);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetAll), new { id = entity.Id }, entity);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<Category>> Update(Guid id, [FromBody] UpdateCategoryRequest request, CancellationToken ct)
    {
        var entity = await db.Categories.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return NotFound();

        var validation = ValidateName(request.Name);
        if (validation.ErrorMessage is not null) return BadRequest(validation.ErrorMessage);

        entity.Name = validation.Name!;
        await db.SaveChangesAsync(ct);

        return Ok(entity);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await db.Categories.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return NotFound();

        var hasProducts = await db.Products.AnyAsync(x => x.CategoryId == id, ct);
        if (hasProducts)
            return BadRequest("Cannot delete a category that has products. Remove or reassign those products first.");

        db.Categories.Remove(entity);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static (string? ErrorMessage, string? Name) ValidateName(string? name)
    {
        var trimmed = (name ?? "").Trim();
        if (trimmed.Length is < 2 or > 120)
            return ("Name must be 2-120 characters.", null);

        return (null, trimmed);
    }
}
