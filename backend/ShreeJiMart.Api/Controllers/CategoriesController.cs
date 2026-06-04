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

    [HttpPost]
    public async Task<ActionResult<Category>> Create([FromBody] CreateCategoryRequest request, CancellationToken ct)
    {
        var name = (request.Name ?? "").Trim();
        if (name.Length is < 2 or > 120) return BadRequest("Name must be 2-120 characters.");

        var entity = new Category { Id = Guid.NewGuid(), Name = name };
        db.Categories.Add(entity);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetAll), new { id = entity.Id }, entity);
    }
}
